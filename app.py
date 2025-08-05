import os
import logging
import datetime

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect


# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()
csrf = CSRFProtect()

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "d3f4ult-s3cr3t-k3y-f0r-d3v")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # Needed for url_for to generate with https
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Prevent caching during development
app.config['TEMPLATES_AUTO_RELOAD'] = True   # Auto-reload templates

# Configure the database
database_url = os.environ.get("DATABASE_URL", "sqlite:///biometrics.db")
# Ensure the URL has the correct dialect - sometimes needed for postgres
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

# Initialize Flask-Login after app is created
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message_category = 'info'

# Initialize CSRF protection
csrf.init_app(app)

# Make 'now' available to all templates
@app.context_processor
def inject_now():
    return {'now': datetime.datetime.now()}

# Define user loader before importing routes
from models import User

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Import routes after app initialization to avoid circular imports
with app.app_context():
    # Create database tables
    db.create_all()
    
    # Import blueprints after models are set up
    from routes.auth import auth_bp
    from routes.biometrics import biometrics_bp
    from routes.profile import profile_bp
    from routes.vehicle import vehicle_bp
    from routes.info import info_bp

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(biometrics_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(vehicle_bp)
    app.register_blueprint(info_bp)

    # Set up a basic route for the home page
    from flask import render_template, request, redirect, url_for

    @app.route('/')
    def index():
        return render_template('index.html')
        
    @app.route('/vehicle/details/<int:vehicle_id>')
    def vehicle_details_redirect(vehicle_id):
        """Legacy URL redirection for vehicle details"""
        return redirect(url_for('vehicle.vehicle_details', vehicle_id=vehicle_id))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
