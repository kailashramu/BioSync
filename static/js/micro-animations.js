/**
 * Micro Animations for Biometric Success
 * Provides visual feedback with animations and sounds when biometric validation succeeds
 */

(function() {
    'use strict';
    
    // Preload audio for better performance
    const audioFiles = {
        face: 'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3',
        voice: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
        retina: 'https://assets.mixkit.co/active_storage/sfx/1126/1126-preview.mp3',
        proximity: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3'
    };
    
    // Create audio objects
    const sounds = {};
    
    // Function to preload sounds
    function preloadSounds() {
        for (const type in audioFiles) {
            try {
                sounds[type] = new Audio(audioFiles[type]);
                sounds[type].preload = 'auto';
                // Load the audio but don't play it
                sounds[type].load();
            } catch (error) {
                console.error(`Failed to preload sound for ${type}:`, error);
            }
        }
    }
    
    // CSS for animations
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(0, 128, 255, 0.7); transform: scale(1); }
            50% { box-shadow: 0 0 30px 10px rgba(0, 128, 255, 0.3); transform: scale(1.2); }
            100% { box-shadow: 0 0 0 0 rgba(0, 128, 255, 0); transform: scale(1); }
        }
        
        @keyframes successCheckmark {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .micro-animation-element {
            position: relative;
        }
        
        .animation-pulse {
            animation: pulseGlow 0.8s ease-in-out;
        }
        
        .animation-checkmark {
            position: absolute;
            top: -10px;
            right: -10px;
            width: 30px;
            height: 30px;
            background-color: #28a745;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            animation: successCheckmark 0.5s ease-in-out forwards;
            z-index: 100;
        }
    `;
    document.head.appendChild(styleElement);
    
    /**
     * Play a success animation for the given biometric type
     * @param {string} biometricType - Type of biometric (face, voice, retina, proximity)
     * @param {HTMLElement} element - Element to animate
     */
    function playSuccessAnimation(biometricType, element) {
        if (!element) {
            console.warn('No element provided for animation');
            return;
        }
        
        // Make sure the element has position relative for absolute positioning of checkmark
        element.classList.add('micro-animation-element');
        
        // Create and append checkmark
        const checkmark = document.createElement('div');
        checkmark.className = 'animation-checkmark';
        checkmark.innerHTML = '<i class="bi bi-check"></i>';
        element.appendChild(checkmark);
        
        // Add animation class
        element.classList.add('animation-pulse');
        
        // Play sound if available
        try {
            if (sounds[biometricType]) {
                sounds[biometricType].currentTime = 0;
                
                // Add an event listener to handle loading errors
                const handleError = () => {
                    console.warn(`Sound failed to load: ${biometricType}`);
                    sounds[biometricType].removeEventListener('error', handleError);
                };
                
                sounds[biometricType].addEventListener('error', handleError);
                
                // Play with promise handling and fallback
                const playPromise = sounds[biometricType].play();
                
                // Modern browsers return a promise from play()
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn(`Sound playback error: ${err.message}`);
                        // Fall back to a browser notification
                        try {
                            // Create a simple beep as fallback using AudioContext
                            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            const oscillator = audioCtx.createOscillator();
                            oscillator.type = 'sine';
                            oscillator.frequency.setValueAtTime(biometricType === 'face' ? 880 : 
                                                              biometricType === 'voice' ? 440 : 
                                                              biometricType === 'retina' ? 660 : 550, audioCtx.currentTime);
                            oscillator.connect(audioCtx.destination);
                            oscillator.start();
                            oscillator.stop(audioCtx.currentTime + 0.15);
                        } catch (fallbackErr) {
                            console.warn('Fallback audio also failed:', fallbackErr);
                        }
                    });
                }
            } else {
                console.warn(`No sound available for ${biometricType}`);
            }
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove('animation-pulse');
            
            // Remove checkmark after a delay
            setTimeout(() => {
                if (checkmark.parentNode === element) {
                    element.removeChild(checkmark);
                }
            }, 3000);
        }, 800);
    }
    
    // Public API
    const microAnimations = {
        playSuccessAnimation: playSuccessAnimation
    };
    
    // Expose the API globally
    window.microAnimations = microAnimations;
    
    // If biometricAnimation exists, add as child API
    if (window.biometricAnimation) {
        window.biometricAnimation.microAnimations = microAnimations;
    }
    
    // Initialize by preloading sounds
    document.addEventListener('DOMContentLoaded', preloadSounds);
    
})();