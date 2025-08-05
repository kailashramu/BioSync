import logging
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from flask_wtf.csrf import validate_csrf
from werkzeug.exceptions import Forbidden
from app import db
from models import Vehicle

vehicle_bp = Blueprint('vehicle', __name__, url_prefix='/vehicles')
logger = logging.getLogger(__name__)

@vehicle_bp.route('/register', methods=['GET', 'POST'])
@login_required
def register_vehicle():
    if request.method == 'POST':
        try:
            make = request.form.get('make')
            model = request.form.get('model')
            year = request.form.get('year')
            license_plate = request.form.get('license_plate')
            vin = request.form.get('vin')
            color = request.form.get('color')
            
            # Basic validation
            if not make or not model or not year:
                flash('Make, model, and year are required', 'danger')
                return render_template('vehicle_register.html')
            
            # Check if VIN is already registered (if provided)
            if vin:
                existing_vehicle = Vehicle.query.filter_by(vin=vin).first()
                if existing_vehicle:
                    flash('A vehicle with this VIN is already registered', 'danger')
                    return render_template('vehicle_register.html')
            
            # Create new vehicle
            new_vehicle = Vehicle(
                user_id=current_user.id,
                make=make,
                model=model,
                year=year,
                license_plate=license_plate,
                vin=vin,
                color=color
            )
            
            db.session.add(new_vehicle)
            db.session.commit()
            
            flash('Vehicle registered successfully!', 'success')
            return redirect(url_for('profile.dashboard'))
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error registering vehicle: {str(e)}")
            flash(f'Error registering vehicle: {str(e)}', 'danger')
    
    return render_template('vehicle_register.html')

@vehicle_bp.route('/edit/<int:vehicle_id>', methods=['GET', 'POST'])
@login_required
def edit_vehicle(vehicle_id):
    # Get the vehicle and verify ownership
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    if vehicle.user_id != current_user.id:
        flash('You do not have permission to edit this vehicle', 'danger')
        return redirect(url_for('profile.dashboard'))
    
    if request.method == 'POST':
        try:
            # Update vehicle details
            vehicle.make = request.form.get('make')
            vehicle.model = request.form.get('model')
            vehicle.year = request.form.get('year')
            vehicle.license_plate = request.form.get('license_plate')
            vehicle.vin = request.form.get('vin')
            vehicle.color = request.form.get('color')
            
            # Check if VIN is already registered to a different vehicle
            if vehicle.vin:
                existing_vehicle = Vehicle.query.filter(Vehicle.vin == vehicle.vin, Vehicle.id != vehicle.id).first()
                if existing_vehicle:
                    flash('A vehicle with this VIN is already registered', 'danger')
                    return render_template('vehicle_register.html', vehicle=vehicle, edit_mode=True)
            
            db.session.commit()
            flash('Vehicle updated successfully!', 'success')
            return redirect(url_for('profile.dashboard'))
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating vehicle: {str(e)}")
            flash(f'Error updating vehicle: {str(e)}', 'danger')
    
    return render_template('vehicle_register.html', vehicle=vehicle, edit_mode=True)

@vehicle_bp.route('/delete/<int:vehicle_id>', methods=['POST'])
@login_required
def delete_vehicle(vehicle_id):
    # Get the vehicle and verify ownership
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    if vehicle.user_id != current_user.id:
        flash('You do not have permission to delete this vehicle', 'danger')
        return redirect(url_for('profile.dashboard'))
    
    try:
        # Validate CSRF token
        csrf_token = request.form.get('csrf_token')
        if not csrf_token:
            logger.error("Missing CSRF token in delete vehicle request")
            flash('CSRF token missing. Please try again.', 'danger')
            return redirect(url_for('profile.dashboard'))
        
        try:
            validate_csrf(csrf_token)
        except:
            logger.error("Invalid CSRF token in delete vehicle request")
            flash('Invalid CSRF token. Please try again.', 'danger')
            return redirect(url_for('profile.dashboard'))
        
        # Delete the vehicle
        db.session.delete(vehicle)
        db.session.commit()
        flash('Vehicle deleted successfully!', 'success')
        logger.info(f"Successfully deleted vehicle ID {vehicle_id} for user ID {current_user.id}")
    except Forbidden as e:
        logger.error(f"CSRF validation error: {str(e)}")
        flash('Security validation failed. Please try again.', 'danger')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting vehicle: {str(e)}")
        flash(f'Error deleting vehicle: {str(e)}', 'danger')
    
    return redirect(url_for('profile.dashboard'))

@vehicle_bp.route('/list')
@login_required
def list_vehicles():
    vehicles = Vehicle.query.filter_by(user_id=current_user.id).all()
    return render_template('vehicles.html', vehicles=vehicles)

@vehicle_bp.route('/details/<int:vehicle_id>')
def vehicle_details(vehicle_id):
    """
    Public route to view vehicle details - accessible via biometric validation
    No login is required for this route
    """
    # Get the vehicle
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    
    # If user is logged in, verify ownership
    if current_user.is_authenticated and vehicle.user_id != current_user.id:
        flash('You do not have permission to view this vehicle', 'danger')
        return redirect(url_for('profile.dashboard'))
    
    # Render the vehicle details template
    return render_template('vehicle_details.html', vehicle=vehicle)
