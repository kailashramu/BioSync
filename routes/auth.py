import logging
import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from app import db
from models import User

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
logger = logging.getLogger(__name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('profile.dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        
        # Validation
        if not username or not email or not password or not confirm_password:
            flash('All fields are required', 'danger')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return render_template('register.html')
        
        # Check if username or email already exists
        existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            if existing_user.username == username:
                flash('Username already exists', 'danger')
            else:
                flash('Email already exists', 'danger')
            return render_template('register.html')
        
        # Create new user
        try:
            new_user = User(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            new_user.set_password(password)
            
            db.session.add(new_user)
            db.session.commit()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error during user registration: {str(e)}")
            # Log details to help debugging
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # More user-friendly message
            flash('Registration failed. Our database is experiencing technical difficulties. Please try again later.', 'danger')
    
    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        # If user is logged in but needs MFA, redirect to MFA page
        if current_user.needs_mfa():
            return redirect(url_for('auth.mfa_verify'))
        return redirect(url_for('profile.dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = 'remember' in request.form
        
        if not username or not password:
            flash('Please enter both username and password', 'danger')
            return render_template('login.html')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            # Password verification passed
            login_user(user, remember=remember)
            
            # Check if user needs to perform MFA
            if user.needs_mfa():
                # Reset MFA status for new login session
                user.set_mfa_completed(False)
                db.session.commit()
                
                # Redirect to MFA verification
                next_page = request.args.get('next')
                if next_page:
                    return redirect(url_for('auth.mfa_verify', next=next_page))
                return redirect(url_for('auth.mfa_verify'))
            else:
                # No MFA required, proceed to dashboard
                next_page = request.args.get('next')
                flash('Login successful!', 'success')
                return redirect(next_page or url_for('profile.dashboard'))
        else:
            flash('Invalid username or password', 'danger')
    
    return render_template('login.html')

@auth_bp.route('/mfa/verify', methods=['GET', 'POST'])
@login_required
def mfa_verify():
    # If MFA is already completed, redirect to dashboard
    if not current_user.needs_mfa():
        return redirect(url_for('profile.dashboard'))
    
    available_biometrics = current_user.get_available_biometrics()
    
    # Get the next URL if any
    next_page = request.args.get('next')
    
    # If no biometrics are setup, can't complete MFA
    if not available_biometrics:
        flash('You need to set up at least one biometric method to use multi-factor authentication.', 'warning')
        return redirect(url_for('profile.dashboard'))
    
    # Default to preferred method if available
    preferred_method = current_user.mfa_preferred_method
    if preferred_method not in available_biometrics:
        preferred_method = available_biometrics[0]
    
    return render_template(
        'mfa_verify.html', 
        available_biometrics=available_biometrics, 
        preferred_method=preferred_method,
        next_page=next_page
    )

@auth_bp.route('/mfa/complete', methods=['POST'])
@login_required
def mfa_complete():
    # This endpoint receives the verification result via AJAX
    if not request.is_json:
        return jsonify({'success': False, 'error': 'Invalid request format'}), 400
    
    biometric_type = request.json.get('biometric_type')
    verification_successful = request.json.get('success', False)
    
    if verification_successful:
        # Mark MFA as completed for this session
        current_user.set_mfa_completed(True)
        db.session.commit()
        
        # Redirect to the next page or dashboard
        next_page = request.json.get('next')
        return jsonify({
            'success': True,
            'redirect': next_page or url_for('profile.dashboard')
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Biometric verification failed. Please try again.'
        }), 401

@auth_bp.route('/mfa/settings', methods=['GET', 'POST'])
@login_required
def mfa_settings():
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'enable_mfa':
            # Enable MFA
            current_user.mfa_enabled = True
            preferred_method = request.form.get('preferred_method')
            if preferred_method in current_user.get_available_biometrics():
                current_user.mfa_preferred_method = preferred_method
            
            # Whether to require MFA for each login
            require_mfa = request.form.get('require_mfa') == 'on'
            current_user.mfa_required = require_mfa
            
            db.session.commit()
            flash('Multi-factor authentication has been enabled.', 'success')
            
        elif action == 'disable_mfa':
            # Disable MFA
            current_user.mfa_enabled = False
            current_user.mfa_required = False
            db.session.commit()
            flash('Multi-factor authentication has been disabled.', 'info')
            
        return redirect(url_for('auth.mfa_settings'))
    
    # GET request
    available_biometrics = current_user.get_available_biometrics()
    
    return render_template(
        'mfa_settings.html',
        available_biometrics=available_biometrics,
        user=current_user
    )

@auth_bp.route('/logout')
@login_required
def logout():
    # Reset MFA completion status on logout
    if current_user.is_authenticated:
        current_user.set_mfa_completed(False)
        db.session.commit()
    
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))
