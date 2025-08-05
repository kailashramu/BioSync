/**
 * Face Biometric Capture Functionality
 */

// Variables for face capture
let faceStream = null;
let faceCanvas = null;
let faceVideo = null;
let captureButton = null;
let retakeButton = null;
let saveButton = null;
let processingMessage = null;

// Initialize face capture
function initFaceBiometrics() {
    faceVideo = document.getElementById('face-video');
    faceCanvas = document.getElementById('face-canvas');
    captureButton = document.getElementById('capture-button');
    retakeButton = document.getElementById('retake-button');
    saveButton = document.getElementById('save-button');
    processingMessage = document.getElementById('processing-message');
    
    if (!faceVideo || !faceCanvas || !captureButton || !retakeButton || !saveButton) {
        handleBiometricError('Required face capture elements not found in the DOM');
        return;
    }
    
    // Setup event listeners
    captureButton.addEventListener('click', captureFace);
    retakeButton.addEventListener('click', resetFaceCapture);
    saveButton.addEventListener('click', saveFaceBiometric);
    
    // Start face capture
    startFaceCapture();
}

// Start the camera for face capture
async function startFaceCapture() {
    try {
        // Request camera with higher resolution for better face recognition
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        };
        
        faceStream = await getCameraStream(constraints);
        
        if (faceVideo) {
            faceVideo.srcObject = faceStream;
            faceVideo.style.display = 'block';
            faceCanvas.style.display = 'none';
            captureButton.disabled = false;
            retakeButton.disabled = true;
            saveButton.disabled = true;
        }
    } catch (error) {
        handleBiometricError(`Error starting face capture: ${error.message}`);
    }
}

// Capture face from video stream
function captureFace() {
    if (!faceVideo || !faceCanvas) {
        handleBiometricError('Video or canvas element not found');
        return;
    }
    
    try {
        // Set canvas dimensions to match video
        faceCanvas.width = faceVideo.videoWidth;
        faceCanvas.height = faceVideo.videoHeight;
        
        // Draw video frame to canvas
        const context = faceCanvas.getContext('2d');
        context.drawImage(faceVideo, 0, 0, faceCanvas.width, faceCanvas.height);
        
        // Display the captured image
        faceVideo.style.display = 'none';
        faceCanvas.style.display = 'block';
        
        // Update button states
        captureButton.disabled = true;
        retakeButton.disabled = false;
        saveButton.disabled = false;
    } catch (error) {
        handleBiometricError(`Error capturing face: ${error.message}`);
    }
}

// Reset face capture (go back to video)
function resetFaceCapture() {
    if (faceVideo && faceCanvas) {
        faceVideo.style.display = 'block';
        faceCanvas.style.display = 'none';
        
        // Clear canvas
        const context = faceCanvas.getContext('2d');
        context.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
        
        // Update button states
        captureButton.disabled = false;
        retakeButton.disabled = true;
        saveButton.disabled = true;
    }
}

// Save face biometric data
function saveFaceBiometric() {
    if (!faceCanvas) {
        handleBiometricError('Canvas element not found');
        return;
    }
    
    try {
        // Show processing message
        if (processingMessage) {
            processingMessage.textContent = 'Processing face data...';
            processingMessage.style.display = 'block';
        }
        
        // Disable buttons during processing
        saveButton.disabled = true;
        retakeButton.disabled = true;
        
        // Get base64 image data from canvas
        const faceDataUri = faceCanvas.toDataURL('image/jpeg');
        
        // Add to hidden form field
        createHiddenInput('face-form', 'face_data', faceDataUri);
        
        // Submit the form
        document.getElementById('face-form').submit();
    } catch (error) {
        handleBiometricError(`Error saving face biometric: ${error.message}`);
        
        // Reset button states
        saveButton.disabled = false;
        retakeButton.disabled = false;
        
        // Hide processing message
        if (processingMessage) {
            processingMessage.style.display = 'none';
        }
    }
}

// Cleanup resources
function cleanupFaceBiometrics() {
    if (faceStream) {
        faceStream.getTracks().forEach(track => track.stop());
        faceStream = null;
    }
}

// Initialize on page load if on face capture page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('face-capture-container')) {
        initFaceBiometrics();
        
        // Clean up on page unload
        window.addEventListener('beforeunload', cleanupFaceBiometrics);
    }
});
