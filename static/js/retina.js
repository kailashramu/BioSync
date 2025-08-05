/**
 * Advanced Retina Biometric Capture Functionality
 * Implements specialized retina targeting interface similar to validation
 */

// Variables for retina capture
let retinaStream = null;
let retinaCanvas = null;
let retinaVideo = null;
let retinaContext = null;
let overlayCanvas = null;
let overlayContext = null;
let isCaptureReady = false;
let scanningAnimation = 0;

// Logging helper
function log(...args) {
    console.log('[RETINA REGISTRATION]', ...args);
}

// Initialize retina capture
function initRetinaBiometrics() {
    log('Initializing retina biometrics registration');
    retinaVideo = document.getElementById('retina-video');
    retinaCanvas = document.getElementById('retina-canvas');
    overlayCanvas = document.getElementById('retina-overlay');
    const captureButton = document.getElementById('capture-retina-button');
    const retakeButton = document.getElementById('retake-retina-button');
    const saveButton = document.getElementById('save-retina-button');
    const scanningIndicator = document.getElementById('scanning-indicator');
    
    if (!retinaVideo || !retinaCanvas || !overlayCanvas || !captureButton || !retakeButton || !saveButton) {
        handleBiometricError('Required retina capture elements not found in the DOM');
        return;
    }
    
    // Initialize canvases
    retinaContext = retinaCanvas.getContext('2d');
    overlayContext = overlayCanvas.getContext('2d');
    
    // Setup event listeners
    captureButton.addEventListener('click', captureRetina);
    retakeButton.addEventListener('click', resetRetinaCapture);
    saveButton.addEventListener('click', saveRetinaBiometric);
    
    // Start retina capture
    startRetinaCapture();
    
    // Start drawing overlay
    drawRetinaOverlay();
    
    // Update button states
    captureButton.disabled = false;
    retakeButton.disabled = true;
    saveButton.disabled = true;
    
    log('Retina biometrics registration initialized');
}

// Start the camera for retina capture
async function startRetinaCapture() {
    try {
        log('Starting camera for retina capture');
        
        // Request camera with higher resolution for better retina imaging
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
                // Try to get high-res images
                advanced: [
                    { zoom: 2 },
                    { whiteBalanceMode: 'manual' },
                    { exposureMode: 'manual' },
                    { focusMode: 'continuous' }
                ]
            }
        };
        
        retinaStream = await getCameraStream(constraints);
        
        if (retinaVideo) {
            retinaVideo.srcObject = retinaStream;
            retinaVideo.style.display = 'block';
            retinaCanvas.style.display = 'none';
            
            // Resize overlay canvas when video loads
            retinaVideo.onloadedmetadata = () => {
                log('Camera access granted for retina capture');
                resizeRetinaCaptureElements();
                isCaptureReady = true;
            };
            
            // Handle video resize to adjust overlay
            retinaVideo.addEventListener('resize', resizeRetinaCaptureElements);
            window.addEventListener('resize', resizeRetinaCaptureElements);
        }
    } catch (error) {
        handleBiometricError(`Error starting retina capture: ${error.message}`);
    }
}

// Resize canvas elements to match video dimensions
function resizeRetinaCaptureElements() {
    if (!retinaVideo || !retinaCanvas || !overlayCanvas) return;
    
    log('Resizing retina capture elements');
    
    // Get video dimensions
    const videoWidth = retinaVideo.videoWidth;
    const videoHeight = retinaVideo.videoHeight;
    
    if (!videoWidth || !videoHeight) {
        log('Video dimensions not ready yet');
        return;
    }
    
    // Set canvas dimensions
    retinaCanvas.width = videoWidth;
    retinaCanvas.height = videoHeight;
    overlayCanvas.width = videoWidth;
    overlayCanvas.height = videoHeight;
}

// Draw guidance overlay for retina positioning - advanced version
function drawRetinaOverlay() {
    if (!overlayContext || !overlayCanvas || !overlayCanvas.width) return;
    
    // Clear previous drawing
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (isCaptureReady) {
        // Draw specialized retina targeting interface
        const centerX = overlayCanvas.width / 2;
        const centerY = overlayCanvas.height / 2;
        const radius = Math.min(overlayCanvas.width, overlayCanvas.height) * 0.2;
        
        // Draw outer circle - white with pulsing effect
        overlayContext.beginPath();
        overlayContext.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        overlayContext.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        overlayContext.lineWidth = 2;
        overlayContext.stroke();
        
        // Draw inner circle - red with pulsing effect
        const pulse = Math.sin(scanningAnimation / 10) * 0.1 + 0.9;
        overlayContext.beginPath();
        overlayContext.arc(centerX, centerY, radius * 0.7 * pulse, 0, 2 * Math.PI);
        overlayContext.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        overlayContext.lineWidth = 1.5;
        overlayContext.stroke();
        
        // Crosshair
        overlayContext.beginPath();
        overlayContext.moveTo(centerX - radius * 1.2, centerY);
        overlayContext.lineTo(centerX + radius * 1.2, centerY);
        overlayContext.moveTo(centerX, centerY - radius * 1.2);
        overlayContext.lineTo(centerX, centerY + radius * 1.2);
        overlayContext.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        overlayContext.lineWidth = 1;
        overlayContext.stroke();
        
        // Scanning line animation
        const scanY = centerY + Math.sin(scanningAnimation / 15) * radius;
        overlayContext.beginPath();
        overlayContext.moveTo(centerX - radius, scanY);
        overlayContext.lineTo(centerX + radius, scanY);
        overlayContext.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        overlayContext.lineWidth = 1;
        overlayContext.stroke();
        
        // Instruction text
        overlayContext.font = '12px Arial';
        overlayContext.fillStyle = 'white';
        overlayContext.textAlign = 'center';
        overlayContext.fillText('Align eye within circle', centerX, centerY + radius * 1.5);
        
        // Update animation
        scanningAnimation += 1;
    }
    
    // Continue drawing overlay (animation loop)
    requestAnimationFrame(drawRetinaOverlay);
}

// Capture retina from video stream
function captureRetina() {
    if (!retinaVideo || !retinaCanvas || !retinaContext) {
        handleBiometricError('Video or canvas element not found');
        return;
    }
    
    try {
        log('Capturing retina image');
        
        // Draw video frame to canvas
        retinaContext.drawImage(retinaVideo, 0, 0, retinaCanvas.width, retinaCanvas.height);
        
        // Apply contrast enhancement for better retina visibility
        enhanceRetinaImage();
        
        // Display the captured image
        retinaVideo.style.display = 'none';
        retinaCanvas.style.display = 'block';
        
        // Update button states
        document.getElementById('capture-retina-button').disabled = true;
        document.getElementById('retake-retina-button').disabled = false;
        document.getElementById('save-retina-button').disabled = false;
        
        // Hide overlay during capture preview
        if (overlayCanvas) {
            overlayCanvas.style.display = 'none';
        }
        
        // Hide scanner bar animation
        document.querySelector('.scanner-bar').style.display = 'none';
        
        // Hide scanning indicator
        document.getElementById('scanning-indicator').style.display = 'none';
        
        log('Retina image captured successfully');
    } catch (error) {
        handleBiometricError(`Error capturing retina: ${error.message}`);
    }
}

// Enhance retina image for better feature visibility
function enhanceRetinaImage() {
    if (!retinaContext || !retinaCanvas) return;
    
    try {
        log('Enhancing retina image for better feature visibility');
        
        // Get image data
        const imageData = retinaContext.getImageData(0, 0, retinaCanvas.width, retinaCanvas.height);
        const data = imageData.data;
        
        // Focus on red channel for blood vessels (similar to validation page)
        for (let i = 0; i < data.length; i += 4) {
            // Enhance red channel and reduce others for better vessel contrast
            data[i] = Math.min(255, data[i] * 1.3); // Red
            data[i + 1] = data[i + 1] * 0.7; // Green
            data[i + 2] = data[i + 2] * 0.7; // Blue
        }
        
        // Put the enhanced image data back
        retinaContext.putImageData(imageData, 0, 0);
        
        log('Retina image enhancement complete');
    } catch (error) {
        console.error('Error enhancing retina image:', error);
        // Continue without enhancement if there's an error
    }
}

// Reset retina capture (go back to video)
function resetRetinaCapture() {
    if (retinaVideo && retinaCanvas) {
        retinaVideo.style.display = 'block';
        retinaCanvas.style.display = 'none';
        
        // Show overlay again
        if (overlayCanvas) {
            overlayCanvas.style.display = 'block';
        }
        
        // Show scanner bar
        document.querySelector('.scanner-bar').style.display = 'block';
        
        // Show scanning indicator
        document.getElementById('scanning-indicator').style.display = 'inline-flex';
        
        // Clear canvas
        retinaContext.clearRect(0, 0, retinaCanvas.width, retinaCanvas.height);
        
        // Update button states
        document.getElementById('capture-retina-button').disabled = false;
        document.getElementById('retake-retina-button').disabled = true;
        document.getElementById('save-retina-button').disabled = true;
    }
}

// Save retina biometric data
function saveRetinaBiometric() {
    if (!retinaCanvas) {
        handleBiometricError('Canvas element not found');
        return;
    }
    
    try {
        // Show processing message
        const processingMessage = document.getElementById('processing-message');
        if (processingMessage) {
            processingMessage.textContent = 'Processing retina data...';
            processingMessage.style.display = 'block';
        }
        
        // Disable buttons during processing
        document.getElementById('save-retina-button').disabled = true;
        document.getElementById('retake-retina-button').disabled = true;
        
        // Get base64 image data from canvas
        const retinaDataUri = retinaCanvas.toDataURL('image/jpeg');
        
        // Add to hidden form field
        createHiddenInput('retina-form', 'retina_data', retinaDataUri);
        
        // Submit the form
        document.getElementById('retina-form').submit();
    } catch (error) {
        handleBiometricError(`Error saving retina biometric: ${error.message}`);
        
        // Reset button states
        document.getElementById('save-retina-button').disabled = false;
        document.getElementById('retake-retina-button').disabled = false;
        
        // Hide processing message
        const processingMessage = document.getElementById('processing-message');
        if (processingMessage) {
            processingMessage.style.display = 'none';
        }
    }
}

// Cleanup resources
function cleanupRetinaBiometrics() {
    if (retinaStream) {
        retinaStream.getTracks().forEach(track => track.stop());
        retinaStream = null;
    }
}

// Initialize on page load if on retina capture page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('retina-capture-container')) {
        initRetinaBiometrics();
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (isCaptureReady) {
                resizeRetinaCaptureElements();
            }
        });
        
        // Clean up on page unload
        window.addEventListener('beforeunload', cleanupRetinaBiometrics);
    }
});
