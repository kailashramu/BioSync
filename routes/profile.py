import logging
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from flask_wtf.csrf import validate_csrf
from werkzeug.exceptions import Forbidden
from app import db
from models import User, FaceBiometric, VoiceBiometric, RetinaBiometric, ProximityData, Vehicle, BiometricAccessLog

profile_bp = Blueprint('profile', __name__, url_prefix='/profile')
logger = logging.getLogger(__name__)

@profile_bp.route('/dashboard')
@login_required
def dashboard():
    # Get user's biometrics status
    face_biometric = FaceBiometric.query.filter_by(user_id=current_user.id).first()
    voice_biometric = VoiceBiometric.query.filter_by(user_id=current_user.id).first()
    retina_biometric = RetinaBiometric.query.filter_by(user_id=current_user.id).first()
    proximity_data = ProximityData.query.filter_by(user_id=current_user.id).first()
    
    # Get user's vehicles
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()
    
    # Get recent access logs
    access_logs = BiometricAccessLog.query.filter_by(user_id=current_user.id).order_by(BiometricAccessLog.timestamp.desc()).limit(10).all()
    
    return render_template('dashboard.html', 
                          face_biometric=face_biometric,
                          voice_biometric=voice_biometric,
                          retina_biometric=retina_biometric,
                          proximity_data=proximity_data,
                          vehicles=vehicles,
                          access_logs=access_logs)

@profile_bp.route('/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    if request.method == 'POST':
        try:
            first_name = request.form.get('first_name')
            last_name = request.form.get('last_name')
            email = request.form.get('email')
            
            # Validate email is not already in use by another user
            if email != current_user.email:
                existing_user = User.query.filter_by(email=email).first()
                if existing_user and existing_user.id != current_user.id:
                    flash('Email is already in use by another account', 'danger')
                    return redirect(url_for('profile.edit_profile'))
            
            # Update user profile
            current_user.first_name = first_name
            current_user.last_name = last_name
            current_user.email = email
            
            # Check if password change was requested
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')
            
            if current_password and new_password and confirm_password:
                # Verify current password
                if not current_user.check_password(current_password):
                    flash('Current password is incorrect', 'danger')
                    return redirect(url_for('profile.edit_profile'))
                
                # Validate new password
                if new_password != confirm_password:
                    flash('New passwords do not match', 'danger')
                    return redirect(url_for('profile.edit_profile'))
                
                # Set new password
                current_user.set_password(new_password)
                flash('Password updated successfully', 'success')
            
            db.session.commit()
            flash('Profile updated successfully', 'success')
            return redirect(url_for('profile.dashboard'))
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating profile: {str(e)}")
            flash(f'Error updating profile: {str(e)}', 'danger')
    
    return render_template('profile.html')

@profile_bp.route('/reset_biometrics/<biometric_type>', methods=['POST'])
@login_required
def reset_biometrics(biometric_type):
    try:
        # Validate CSRF token
        csrf_token = request.form.get('csrf_token')
        if not csrf_token:
            logger.error("Missing CSRF token in reset biometrics request")
            flash('CSRF token missing. Please try again.', 'danger')
            return redirect(url_for('profile.dashboard'))
        
        try:
            validate_csrf(csrf_token)
        except:
            logger.error("Invalid CSRF token in reset biometrics request")
            flash('Invalid CSRF token. Please try again.', 'danger')
            return redirect(url_for('profile.dashboard'))
        
        # Process biometric reset based on type
        if biometric_type == 'all':
            # Delete all biometric data for the current user
            FaceBiometric.query.filter_by(user_id=current_user.id).delete()
            VoiceBiometric.query.filter_by(user_id=current_user.id).delete()
            RetinaBiometric.query.filter_by(user_id=current_user.id).delete()
            ProximityData.query.filter_by(user_id=current_user.id).delete()
            flash('All biometric data has been reset', 'success')
        elif biometric_type == 'face':
            FaceBiometric.query.filter_by(user_id=current_user.id).delete()
            flash('Face biometric data has been reset', 'success')
        elif biometric_type == 'voice':
            VoiceBiometric.query.filter_by(user_id=current_user.id).delete()
            flash('Voice biometric data has been reset', 'success')
        elif biometric_type == 'retina':
            RetinaBiometric.query.filter_by(user_id=current_user.id).delete()
            flash('Retina biometric data has been reset', 'success')
        elif biometric_type == 'proximity':
            ProximityData.query.filter_by(user_id=current_user.id).delete()
            flash('Proximity data has been reset', 'success')
        else:
            flash('Invalid biometric type', 'danger')
            return redirect(url_for('profile.dashboard'))
        
        # Clear client-side storage via flash message flag
        flash('clear_biometrics_storage', 'clear_storage')
        
        db.session.commit()
        logger.info(f"Successfully reset {biometric_type} biometric data for user ID {current_user.id}")
    except Forbidden as e:
        logger.error(f"CSRF validation error: {str(e)}")
        flash('Security validation failed. Please try again.', 'danger')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error resetting biometric data: {str(e)}")
        flash(f'Error resetting biometric data: {str(e)}', 'danger')
    
    return redirect(url_for('profile.dashboard'))
