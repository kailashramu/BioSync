from flask import Blueprint, render_template

# Create the blueprint
info_bp = Blueprint('info', __name__)

@info_bp.route('/technology')
def technology():
    """Page explaining the technology and concepts behind the biometric validation"""
    return render_template('technology.html')