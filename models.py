from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'  # Explicitly name the table to avoid reserved keyword issues
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Multi-factor authentication settings
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_preferred_method = db.Column(db.String(20), nullable=True)  # 'face', 'voice', 'retina', 'proximity'
    mfa_required = db.Column(db.Boolean, default=False)  # Whether MFA is required for this user
    last_mfa_auth = db.Column(db.DateTime, nullable=True)  # When they last performed MFA
    
    # Session management for MFA
    mfa_completed = db.Column(db.Boolean, default=False)  # Whether MFA has been completed in current session
    
    # Relationships
    face_biometric = db.relationship('FaceBiometric', backref='user', uselist=False, lazy=True, cascade="all, delete-orphan")
    voice_biometric = db.relationship('VoiceBiometric', backref='user', uselist=False, lazy=True, cascade="all, delete-orphan")
    retina_biometric = db.relationship('RetinaBiometric', backref='user', uselist=False, lazy=True, cascade="all, delete-orphan")
    proximity_data = db.relationship('ProximityData', backref='user', uselist=False, lazy=True, cascade="all, delete-orphan")
    vehicles = db.relationship('Vehicle', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def has_biometric_setup(self, biometric_type=None):
        """Check if the user has setup at least one biometric or specific biometric."""
        if biometric_type == 'face' or biometric_type is None:
            if self.face_biometric is not None:
                return True
                
        if biometric_type == 'voice' or biometric_type is None:
            if self.voice_biometric is not None:
                return True
                
        if biometric_type == 'retina' or biometric_type is None:
            if self.retina_biometric is not None:
                return True
                
        if biometric_type == 'proximity' or biometric_type is None:
            if self.proximity_data is not None:
                return True
        
        return False
        
    def get_available_biometrics(self):
        """Return a list of biometric types that are setup for this user."""
        available = []
        if self.face_biometric is not None:
            available.append('face')
        if self.voice_biometric is not None:
            available.append('voice')
        if self.retina_biometric is not None:
            available.append('retina')
        if self.proximity_data is not None:
            available.append('proximity')
        return available
        
    def set_mfa_completed(self, status=True):
        """Set the MFA completed status for the current session."""
        self.mfa_completed = status
        if status:
            self.last_mfa_auth = datetime.utcnow()
        
    def needs_mfa(self):
        """Check if the user needs to complete MFA at this point."""
        if not self.mfa_enabled or not self.mfa_required:
            return False
        
        # If MFA is already completed for this session, no need to do it again
        if self.mfa_completed:
            return False
            
        # Check if user has any biometrics setup
        if not self.has_biometric_setup():
            return False
            
        return True
        
    def __repr__(self):
        return f'<User {self.username}>'


class FaceBiometric(db.Model):
    __tablename__ = 'face_biometrics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    face_data = db.Column(db.LargeBinary, nullable=False)  # Stores facial features as binary data
    face_encoding = db.Column(db.Text, nullable=True)  # Stores facial encodings as text (JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<FaceBiometric for User {self.user_id}>'


class VoiceBiometric(db.Model):
    __tablename__ = 'voice_biometrics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    voice_data = db.Column(db.LargeBinary, nullable=False)  # Stores voice sample as binary
    voice_features = db.Column(db.Text, nullable=True)  # Stores extracted features as text (JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<VoiceBiometric for User {self.user_id}>'


class RetinaBiometric(db.Model):
    __tablename__ = 'retina_biometrics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    retina_data = db.Column(db.LargeBinary, nullable=False)  # Stores retina image as binary
    retina_features = db.Column(db.Text, nullable=True)  # Stores extracted features as text (JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<RetinaBiometric for User {self.user_id}>'


class ProximityData(db.Model):
    __tablename__ = 'proximity_data_records'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    key_proximity_id = db.Column(db.String(128), nullable=True)  # Unique identifier for proximity key
    mobile_device_id = db.Column(db.String(128), nullable=True)  # Unique identifier for mobile device
    bluetooth_address = db.Column(db.String(64), nullable=True)  # Bluetooth MAC address
    nfc_tag_id = db.Column(db.String(128), nullable=True)  # NFC tag identifier
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<ProximityData for User {self.user_id}>'


class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    make = db.Column(db.String(64), nullable=False)
    model = db.Column(db.String(64), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    license_plate = db.Column(db.String(20), nullable=True)
    vin = db.Column(db.String(17), nullable=True, unique=True)  # Vehicle Identification Number
    color = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Vehicle {self.make} {self.model} ({self.year}) owned by User {self.user_id}>'


class BiometricAccessLog(db.Model):
    __tablename__ = 'biometric_access_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=True)
    access_type = db.Column(db.String(30), nullable=False)  # face, voice, key_proximity, mobile_proximity, retina
    access_status = db.Column(db.Boolean, default=False)  # Success or failure
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45), nullable=True)  # To track access location
    
    # Relationships
    user = db.relationship('User', backref='access_logs')
    vehicle = db.relationship('Vehicle', backref='access_logs')

    def __repr__(self):
        status = "Success" if self.access_status else "Failure"
        return f'<BiometricAccessLog {self.access_type} {status} at {self.timestamp}>'
