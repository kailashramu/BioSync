/**
 * Biometrics Collection Core Functionality
 * Common utilities and functions for biometric data collection
 */

// Global error handling for biometric operations
function handleBiometricError(errorMessage) {
    console.error('Biometric Error:', errorMessage);
    const errorAlert = document.createElement('div');
    errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-3';
    errorAlert.role = 'alert';
    errorAlert.innerHTML = `
        <strong>Error!</strong> ${errorMessage}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container') || document.body;
    container.prepend(errorAlert);
    
    // Automatically dismiss after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(errorAlert);
        bsAlert.close();
    }, 5000);
}

// Utility function for checking browser support for various biometric features
function checkBrowserSupport() {
    const supportInfo = {
        camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        bluetooth: !!navigator.bluetooth,
        webAudio: !!(window.AudioContext || window.webkitAudioContext),
        webGL: (() => {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && 
                    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
            } catch(e) {
                return false;
            }
        })()
    };
    
    return supportInfo;
}

// Utility function to show browser support warnings
function showBrowserSupportWarnings() {
    const support = checkBrowserSupport();
    const warnings = [];
    
    if (!support.camera) {
        warnings.push('Your browser does not support camera access, which is required for face and retina biometrics.');
    }
    
    if (!support.microphone) {
        warnings.push('Your browser does not support microphone access, which is required for voice biometrics.');
    }
    
    if (!support.bluetooth) {
        warnings.push('Your browser does not support Bluetooth, which may limit proximity detection features.');
    }
    
    if (warnings.length > 0) {
        const warningContainer = document.createElement('div');
        warningContainer.className = 'alert alert-warning mt-3';
        
        const warningList = document.createElement('ul');
        warnings.forEach(warning => {
            const item = document.createElement('li');
            item.textContent = warning;
            warningList.appendChild(item);
        });
        
        warningContainer.innerHTML = '<strong>Browser Compatibility Issues:</strong>';
        warningContainer.appendChild(warningList);
        
        const container = document.querySelector('.container') || document.body;
        container.prepend(warningContainer);
    }
}

// Function to get camera stream with specified constraints
async function getCameraStream(constraints = { video: true }) {
    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
        handleBiometricError(`Could not access camera: ${error.message}`);
        throw error;
    }
}

// Function to get audio stream
async function getAudioStream(constraints = { audio: true }) {
    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
        handleBiometricError(`Could not access microphone: ${error.message}`);
        throw error;
    }
}

// Utility to create and populate a hidden form field with data
function createHiddenInput(formId, name, data) {
    const form = document.getElementById(formId);
    if (!form) {
        handleBiometricError(`Form with ID "${formId}" not found`);
        return null;
    }
    
    // Remove any existing input with the same name
    const existingInput = form.querySelector(`input[name="${name}"]`);
    if (existingInput) {
        form.removeChild(existingInput);
    }
    
    // Create and add the new input
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = data;
    form.appendChild(input);
    
    return input;
}

// Check for biometric status and update UI accordingly
function updateBiometricStatus() {
    fetch('/biometrics/status')
        .then(response => response.json())
        .then(data => {
            // Update UI based on which biometrics are registered
            const statusElements = document.querySelectorAll('[data-biometric-status]');
            statusElements.forEach(element => {
                const biometricType = element.dataset.biometricStatus;
                if (data[biometricType]) {
                    element.classList.add('text-success');
                    element.classList.remove('text-danger');
                    element.textContent = 'Registered';
                } else {
                    element.classList.add('text-danger');
                    element.classList.remove('text-success');
                    element.textContent = 'Not Registered';
                }
            });
        })
        .catch(error => {
            console.error('Error fetching biometric status:', error);
        });
}

// Initialize all biometric pages
document.addEventListener('DOMContentLoaded', function() {
    // Show browser support warnings if needed
    showBrowserSupportWarnings();
    
    // Update biometric status if on dashboard
    if (document.querySelector('[data-biometric-status]')) {
        updateBiometricStatus();
    }
});
