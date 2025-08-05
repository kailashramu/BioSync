/**
 * Voice Biometric Capture Functionality
 */

// Variables for voice capture
let audioContext = null;
let audioStream = null;
let audioRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordedBlob = null;
let audioPlayer = null;

// Initialize voice capture
function initVoiceBiometrics() {
    const startRecordButton = document.getElementById('start-record-button');
    const stopRecordButton = document.getElementById('stop-record-button');
    const saveVoiceButton = document.getElementById('save-voice-button');
    const retakeVoiceButton = document.getElementById('retake-voice-button');
    audioPlayer = document.getElementById('audio-player');
    
    if (!startRecordButton || !stopRecordButton || !saveVoiceButton || !retakeVoiceButton || !audioPlayer) {
        handleBiometricError('Required voice capture elements not found in the DOM');
        return;
    }
    
    // Setup event listeners
    startRecordButton.addEventListener('click', startVoiceRecording);
    stopRecordButton.addEventListener('click', stopVoiceRecording);
    saveVoiceButton.addEventListener('click', saveVoiceBiometric);
    retakeVoiceButton.addEventListener('click', resetVoiceCapture);
    
    // Set initial button states
    stopRecordButton.disabled = true;
    saveVoiceButton.disabled = true;
    retakeVoiceButton.disabled = true;
    
    // Initialize Web Audio API
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
    } catch (e) {
        handleBiometricError('Web Audio API is not supported in this browser');
    }
}

// Start voice recording
async function startVoiceRecording() {
    try {
        const startRecordButton = document.getElementById('start-record-button');
        const stopRecordButton = document.getElementById('stop-record-button');
        const recordingIndicator = document.getElementById('recording-indicator');
        
        // Reset previous recording if any
        resetVoiceCapture();
        
        // Get audio stream
        audioStream = await getAudioStream({ 
            audio: { 
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        // Create MediaRecorder
        audioRecorder = new MediaRecorder(audioStream);
        audioChunks = [];
        
        // Handle data available event
        audioRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        // Handle recording stop event
        audioRecorder.onstop = () => {
            // Create blob from recorded chunks
            recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // Set as audio player source
            const audioURL = URL.createObjectURL(recordedBlob);
            audioPlayer.src = audioURL;
            audioPlayer.style.display = 'block';
            
            // Update button states
            startRecordButton.disabled = false;
            stopRecordButton.disabled = true;
            document.getElementById('save-voice-button').disabled = false;
            document.getElementById('retake-voice-button').disabled = false;
            
            // Hide recording indicator
            if (recordingIndicator) {
                recordingIndicator.style.display = 'none';
            }
            
            isRecording = false;
        };
        
        // Start recording
        audioRecorder.start();
        isRecording = true;
        
        // Update UI
        startRecordButton.disabled = true;
        stopRecordButton.disabled = false;
        
        // Show recording indicator
        if (recordingIndicator) {
            recordingIndicator.style.display = 'block';
        }
        
    } catch (error) {
        handleBiometricError(`Error starting voice recording: ${error.message}`);
    }
}

// Stop voice recording
function stopVoiceRecording() {
    if (audioRecorder && isRecording) {
        audioRecorder.stop();
        
        // Stop all audio tracks
        if (audioStream) {
            audioStream.getAudioTracks().forEach(track => track.stop());
        }
    }
}

// Reset voice capture
function resetVoiceCapture() {
    // Stop recording if in progress
    if (isRecording) {
        stopVoiceRecording();
    }
    
    // Reset audio player
    if (audioPlayer) {
        audioPlayer.src = '';
        audioPlayer.style.display = 'none';
    }
    
    // Reset blob
    recordedBlob = null;
    audioChunks = [];
    
    // Reset UI
    document.getElementById('start-record-button').disabled = false;
    document.getElementById('stop-record-button').disabled = true;
    document.getElementById('save-voice-button').disabled = true;
    document.getElementById('retake-voice-button').disabled = true;
    
    const recordingIndicator = document.getElementById('recording-indicator');
    if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
    }
}

// Save voice biometric data
function saveVoiceBiometric() {
    if (!recordedBlob) {
        handleBiometricError('No voice recording to save');
        return;
    }
    
    try {
        // Show processing message
        const processingMessage = document.getElementById('processing-message');
        if (processingMessage) {
            processingMessage.textContent = 'Processing voice data...';
            processingMessage.style.display = 'block';
        }
        
        // Disable buttons during processing
        document.getElementById('save-voice-button').disabled = true;
        document.getElementById('retake-voice-button').disabled = true;
        
        // Read blob as data URL
        const reader = new FileReader();
        reader.readAsDataURL(recordedBlob);
        reader.onloadend = function() {
            const base64data = reader.result;
            
            // Add to hidden form field
            createHiddenInput('voice-form', 'voice_data', base64data);
            
            // Submit the form
            document.getElementById('voice-form').submit();
        };
        
    } catch (error) {
        handleBiometricError(`Error saving voice biometric: ${error.message}`);
        
        // Reset button states
        document.getElementById('save-voice-button').disabled = false;
        document.getElementById('retake-voice-button').disabled = false;
        
        // Hide processing message
        const processingMessage = document.getElementById('processing-message');
        if (processingMessage) {
            processingMessage.style.display = 'none';
        }
    }
}

// Cleanup resources
function cleanupVoiceBiometrics() {
    if (isRecording) {
        stopVoiceRecording();
    }
    
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
}

// Initialize on page load if on voice capture page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('voice-capture-container')) {
        initVoiceBiometrics();
        
        // Clean up on page unload
        window.addEventListener('beforeunload', cleanupVoiceBiometrics);
    }
});
