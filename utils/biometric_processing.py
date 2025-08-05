import numpy as np
import cv2
import logging
import io
import json
from PIL import Image
import tempfile
import os
import base64
import librosa
import pickle
from sklearn.preprocessing import StandardScaler
from collections import Counter

logger = logging.getLogger(__name__)

def process_face_biometric(face_data_binary):
    """
    Process face image data and extract facial features using OpenCV.
    
    Args:
        face_data_binary: Binary image data (can be raw binary or base64 data URI)
        
    Returns:
        Face encoding vector or None if processing fails
    """
    try:
        # Check if the input is a data URI (from canvas.toDataURL())
        if isinstance(face_data_binary, str) and face_data_binary.startswith('data:image'):
            # Extract the base64 part
            face_data_binary = face_data_binary.split(',')[1]
            # Decode base64
            face_data_binary = base64.b64decode(face_data_binary)
        
        # Create temporary file for OpenCV to process
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            temp_filename = temp_file.name
            temp_file.write(face_data_binary)
        
        # Use OpenCV to load and process image
        img = cv2.imread(temp_filename)
        if img is None:
            logger.error("Failed to load face image data")
            os.unlink(temp_filename)
            return None
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Use OpenCV's face detector
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            logger.warning("No face detected in the image")
            os.unlink(temp_filename)
            return None
        
        # Use the first detected face
        x, y, w, h = faces[0]
        face_roi = img[y:y+h, x:x+w]
        
        # Process the face region using reliable techniques
        # 1. HOG features (Histogram of Oriented Gradients) - works well for face recognition
        face_roi_resized = cv2.resize(face_roi, (128, 128))
        hog = cv2.HOGDescriptor((128, 128), (16, 16), (8, 8), (8, 8), 9)
        hog_features = hog.compute(face_roi_resized)
        
        # 2. Simple color histogram features
        face_roi_gray = cv2.cvtColor(face_roi_resized, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([face_roi_gray], [0], None, [64], [0, 256])
        hist_features = hist.flatten().astype(np.float32)
        
        # We'll use HOG as the primary feature for now as it's most reliable
        face_features = hog_features
        
        logger.info("Successfully extracted face features using OpenCV")
        
        # Clean up temporary file
        os.unlink(temp_filename)
        
        return face_features
    except Exception as e:
        logger.error(f"Error processing face biometric: {str(e)}")
        # Make sure temporary file is deleted even on error
        try:
            if 'temp_filename' in locals():
                os.unlink(temp_filename)
        except:
            pass
        return None

def process_voice_biometric(voice_data_binary):
    """
    Process voice audio data and extract voice features using librosa.
    
    Args:
        voice_data_binary: Binary audio data or base64 data URI
        
    Returns:
        Dictionary containing voice features
    """
    try:
        # Check if the data is empty or too small to be valid voice data
        if voice_data_binary is None or (isinstance(voice_data_binary, bytes) and len(voice_data_binary) < 1000):
            logger.warning("Voice data is empty or too short to be valid")
            return {'error': 'Voice recording is too short or empty'}
            
        # Check if the input is a data URI (from audio recorder)
        if isinstance(voice_data_binary, str):
            # Handle base64 encoded audio data
            if voice_data_binary.startswith('data:audio'):
                # Extract the base64 part
                voice_data_binary = voice_data_binary.split(',')[1]
                # Decode base64
                voice_data_binary = base64.b64decode(voice_data_binary)
                
                # Check again after decoding
                if len(voice_data_binary) < 1000:
                    logger.warning("Decoded voice data is too short to be valid")
                    return {'error': 'Voice recording is too short'}
            else:
                # If it's a string but not a data URI, it's not valid
                raise ValueError("Invalid voice data format. Must be binary data or data URI.")

        # Use librosa to extract advanced features from audio
        # First, save the binary data to a temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_filename = temp_file.name
            temp_file.write(voice_data_binary)
        
        try:
            # Load the audio with librosa
            y, sr = librosa.load(temp_filename, sr=None)
            
            # Enhanced feature extraction with more voice characteristics
            # 1. Mel-frequency cepstral coefficients (MFCCs) with more coefficients
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)  # Increased from 13 to 20
            mfcc_mean = np.mean(mfccs, axis=1).tolist()
            mfcc_std = np.std(mfccs, axis=1).tolist()  # Standard deviation captures more variation
            
            # 2. Spectral centroid (center of mass of the spectrum)
            centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
            centroid_mean = float(np.mean(centroid))
            centroid_std = float(np.std(centroid))  # Variation in centroid
            
            # 3. Zero crossing rate (how often the signal changes sign)
            zcr = librosa.feature.zero_crossing_rate(y)
            zcr_mean = float(np.mean(zcr))
            zcr_std = float(np.std(zcr))  # Variation in zero crossing
            
            # 4. Spectral rolloff (frequency below which most energy lies)
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
            rolloff_mean = float(np.mean(rolloff))
            rolloff_std = float(np.std(rolloff))  # Variation in rolloff
            
            # 5. Spectral contrast (differences between peaks and valleys)
            contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
            contrast_mean = np.mean(contrast, axis=1).tolist()
            
            # 6. Spectral bandwidth (variance in the spectrum)
            bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
            bandwidth_mean = float(np.mean(bandwidth))
            
            # 7. Chroma features (energy distribution across notes)
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            chroma_mean = np.mean(chroma, axis=1).tolist()
            
            # 8. RMSF (root mean square energy)
            rms = librosa.feature.rms(y=y)
            rms_mean = float(np.mean(rms))
            rms_std = float(np.std(rms))  # Volume variations
            
            # 9. Extracts key tempo information
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)
            
            # 10. Harmonic and percussive components
            y_harmonic, y_percussive = librosa.effects.hpss(y)
            harmonic_mean = float(np.mean(y_harmonic))
            percussive_mean = float(np.mean(y_percussive))
            
            # Advanced feature: Voice pitch estimation
            try:
                f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=50, fmax=500)
                f0_mean = float(np.nanmean(f0))  # Fundamental frequency mean (voice pitch)
                f0_std = float(np.nanstd(f0))    # Variation in fundamental frequency
            except:
                f0_mean = 0.0
                f0_std = 0.0
            
            # Complete feature dictionary with all extracted features
            features = {
                # Core features
                'mfcc_coefficients': mfcc_mean,
                'mfcc_std': mfcc_std,
                'spectral_centroid': centroid_mean,
                'spectral_centroid_std': centroid_std,
                'zero_crossing_rate': zcr_mean,
                'zero_crossing_std': zcr_std,
                'spectral_rolloff': rolloff_mean,
                'spectral_rolloff_std': rolloff_std,
                
                # Advanced features
                'spectral_contrast': contrast_mean,
                'spectral_bandwidth': bandwidth_mean,
                'chroma_features': chroma_mean,
                'rms_energy': rms_mean,
                'rms_energy_std': rms_std,
                'harmonic_mean': harmonic_mean,
                'percussive_mean': percussive_mean,
                'f0_pitch_mean': f0_mean,
                'f0_pitch_std': f0_std,
                
                # Timing features
                'estimated_tempo': float(tempo[0]),
                'duration': float(librosa.get_duration(y=y, sr=sr))
            }
            
            logger.info("Successfully extracted voice biometric features using librosa")
            
        except Exception as processing_error:
            logger.warning(f"Error using advanced audio processing: {processing_error}, falling back to basic processing")
            
            # Fallback to simple feature extraction if librosa fails
            audio_array = np.frombuffer(voice_data_binary, dtype=np.uint8)
            features = {
                'audio_length': len(voice_data_binary),
                'avg_value': float(np.mean(audio_array)),
                'variance': float(np.var(audio_array))
            }
        
        # Clean up temporary file
        os.unlink(temp_filename)
        
        return features
    except Exception as e:
        logger.error(f"Error processing voice biometric: {str(e)}")
        # Make sure temporary file is deleted even on error
        try:
            if 'temp_filename' in locals():
                os.unlink(temp_filename)
        except:
            pass
        return {'error': str(e)}

def process_retina_biometric(retina_data_binary):
    """
    Process retina image data and extract retina features.
    
    Args:
        retina_data_binary: Binary image data or base64 data URI
        
    Returns:
        Dictionary containing retina features
    """
    try:
        # Check if the input is a data URI (from canvas.toDataURL())
        if isinstance(retina_data_binary, str) and retina_data_binary.startswith('data:image'):
            # Extract the base64 part
            retina_data_binary = retina_data_binary.split(',')[1]
            # Decode base64
            retina_data_binary = base64.b64decode(retina_data_binary)
            
        # Create temporary file for OpenCV to process
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            temp_filename = temp_file.name
            temp_file.write(retina_data_binary)
        
        # Use OpenCV to load and process image
        img = cv2.imread(temp_filename)
        if img is None:
            logger.error("Failed to load retina image data")
            os.unlink(temp_filename)
            return {'error': 'Failed to load image data'}
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization to enhance blood vessel patterns
        equalized = cv2.equalizeHist(gray)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(equalized, (5, 5), 0)
        
        # Apply Canny edge detection to identify blood vessel edges
        edges = cv2.Canny(blurred, 50, 150)
        
        # Use Hough transform to detect circles (optic disc)
        circles = cv2.HoughCircles(
            blurred, 
            cv2.HOUGH_GRADIENT, 
            dp=1, 
            minDist=50, 
            param1=50, 
            param2=30, 
            minRadius=10, 
            maxRadius=100
        )
        
        # Extract features
        features = {
            'edge_density': float(np.sum(edges) / (edges.shape[0] * edges.shape[1])),
            'mean_intensity': float(np.mean(gray)),
            'std_intensity': float(np.std(gray)),
        }
        
        # Add circle features if circles are detected
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            features['num_circles'] = len(circles)
            if len(circles) > 0:
                features['main_circle_x'] = int(circles[0][0])
                features['main_circle_y'] = int(circles[0][1])
                features['main_circle_radius'] = int(circles[0][2])
        else:
            features['num_circles'] = 0
        
        # Clean up temporary file
        os.unlink(temp_filename)
        
        return features
    except Exception as e:
        logger.error(f"Error processing retina biometric: {str(e)}")
        # Make sure temporary file is deleted even on error
        try:
            if 'temp_filename' in locals():
                os.unlink(temp_filename)
        except:
            pass
        return {'error': str(e)}
