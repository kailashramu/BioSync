import hashlib
import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from flask import current_app

logger = logging.getLogger(__name__)

# Generate a secure key for encryption or use an environment variable
def get_encryption_key():
    """
    Get or generate an encryption key for sensitive data.
    The key is derived from an environment variable or a default value using PBKDF2.
    """
    # Get the secret key from environment or use a default (not recommended for production)
    secret = os.environ.get("BIOMETRIC_ENCRYPTION_KEY", current_app.secret_key)
    
    # Use a fixed salt for deterministic key generation
    salt = b'biometric_salt_value'
    
    # Generate a secure key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    
    key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
    return key

def encrypt_data(data):
    """
    Encrypt sensitive biometric data using Fernet symmetric encryption.
    
    Args:
        data: The binary data to encrypt
        
    Returns:
        Encrypted binary data
    """
    try:
        key = get_encryption_key()
        cipher = Fernet(key)
        encrypted_data = cipher.encrypt(data)
        return encrypted_data
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        # Return the original data if encryption fails
        # In production, you might want to raise an exception instead
        return data

def decrypt_data(encrypted_data):
    """
    Decrypt encrypted biometric data using Fernet symmetric encryption.
    
    Args:
        encrypted_data: The encrypted binary data
        
    Returns:
        Decrypted binary data
    """
    try:
        key = get_encryption_key()
        cipher = Fernet(key)
        decrypted_data = cipher.decrypt(encrypted_data)
        return decrypted_data
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        # Return the original data if decryption fails
        # In production, you might want to raise an exception instead
        return encrypted_data

def hash_identifier(identifier):
    """
    Create a secure hash of an identifier (like a key ID or device ID).
    
    Args:
        identifier: The string identifier to hash
        
    Returns:
        Hashed identifier string
    """
    # Add a salt to prevent rainbow table attacks
    salt = os.environ.get("HASH_SALT", current_app.secret_key).encode()
    
    # Create the hash
    h = hashlib.sha256()
    h.update(salt)
    h.update(identifier.encode())
    
    return h.hexdigest()

def secure_compare(val1, val2):
    """
    Perform a constant-time comparison of two values to prevent timing attacks.
    
    Args:
        val1: First value to compare
        val2: Second value to compare
        
    Returns:
        True if the values are equal, False otherwise
    """
    return hashlib.compare_digest(str(val1), str(val2))
