/**
 * Welcome Animation Module
 * Creates personalized car-themed welcome animations for users
 */

// Create the welcome animation namespace
window.welcomeAnimation = window.welcomeAnimation || {};

(function() {
    'use strict';
    
    // Store DOM elements
    let animationContainer = null;
    let currentAnimation = null;
    let userName = null;
    
    /**
     * Initialize the welcome animation system
     */
    function init() {
        console.log('Welcome animation system initialized');
        
        // Create animation container if it doesn't exist
        if (!document.getElementById('welcome-animation-container')) {
            createAnimationContainer();
        }
    }
    
    /**
     * Create the animation container in the DOM
     */
    function createAnimationContainer() {
        // Create the animation container
        animationContainer = document.createElement('div');
        animationContainer.id = 'welcome-animation-container';
        animationContainer.className = 'welcome-animation-container';
        animationContainer.style.display = 'none';
        
        // Add to the body
        document.body.appendChild(animationContainer);
        
        // Add basic styles if not already in CSS
        addAnimationStyles();
    }
    
    /**
     * Add animation styles to the document if not already present
     */
    function addAnimationStyles() {
        // Check if styles already exist
        if (document.getElementById('welcome-animation-styles')) {
            return;
        }
        
        // Create style element
        const styleEl = document.createElement('style');
        styleEl.id = 'welcome-animation-styles';
        
        // Add the CSS for animations
        styleEl.textContent = `
            .welcome-animation-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.85);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
                pointer-events: none;
                font-family: 'Roboto', sans-serif;
            }
            
            .welcome-animation-container.visible {
                opacity: 1;
                pointer-events: all;
            }
            
            .welcome-animation-container .animation-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                max-width: 800px;
                padding: 20px;
            }
            
            .welcome-animation-container .welcome-text {
                color: white;
                font-size: 2.5rem;
                font-weight: 300;
                text-align: center;
                margin-bottom: 2rem;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.8s ease, transform 0.8s ease;
            }
            
            .welcome-animation-container.visible .welcome-text {
                opacity: 1;
                transform: translateY(0);
            }
            
            .welcome-animation-container .user-name {
                color: #e50000; /* Audi red */
                font-weight: 700;
                font-size: 3rem;
                display: block;
                margin-top: 0.5rem;
            }
            
            .welcome-animation-container .car-animation {
                width: 100%;
                max-width: 500px;
                margin: 2rem 0;
                opacity: 0;
                transform: translateX(-50px);
                transition: opacity 1s ease 0.3s, transform 1s ease 0.3s;
            }
            
            .welcome-animation-container.visible .car-animation {
                opacity: 1;
                transform: translateX(0);
            }
            
            .welcome-animation-container .audi-rings {
                width: 120px;
                height: 40px;
                margin-top: 2rem;
                margin-bottom: 1rem;
                opacity: 0;
                transform: scale(0.8);
                transition: opacity 0.5s ease 1s, transform 0.5s ease 1s;
            }
            
            .welcome-animation-container.visible .audi-rings {
                opacity: 1;
                transform: scale(1);
            }
            
            .welcome-animation-container .tagline {
                color: #cccccc;
                font-size: 1.2rem;
                font-weight: 300;
                font-style: italic;
                text-align: center;
                margin-top: 0.5rem;
                opacity: 0;
                transition: opacity 0.5s ease 1.2s;
            }
            
            .welcome-animation-container.visible .tagline {
                opacity: 1;
            }
            
            .welcome-animation-container .continue-btn {
                background-color: #e50000;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 1rem;
                margin-top: 2rem;
                cursor: pointer;
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.5s ease 1.5s, transform 0.5s ease 1.5s, background-color 0.3s ease;
            }
            
            .welcome-animation-container.visible .continue-btn {
                opacity: 1;
                transform: translateY(0);
            }
            
            .welcome-animation-container .continue-btn:hover {
                background-color: #c40000;
            }
            
            /* Car headlights animation */
            @keyframes headlights-flash {
                0%, 100% { opacity: 0.7; filter: blur(5px); }
                50% { opacity: 1; filter: blur(10px); }
            }
            
            .welcome-animation-container .headlights {
                position: absolute;
                width: 30px;
                height: 15px;
                background-color: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                filter: blur(5px);
                animation: headlights-flash 2s infinite;
            }
            
            .welcome-animation-container .left-light {
                left: 130px;
                top: 50%;
            }
            
            .welcome-animation-container .right-light {
                left: 160px;
                top: 50%;
            }
        `;
        
        // Add to document head
        document.head.appendChild(styleEl);
    }
    
    /**
     * Show the welcome animation for the user
     * @param {string} name - The user's name
     * @param {string} vehicleModel - Optional vehicle model name
     */
    function showWelcomeAnimation(name, vehicleModel = null) {
        // SECURITY CHECK: Verify that biometrics match the same user before showing animation
        const biometricSecurityCheck = typeof window.biometricAnimation !== 'undefined' && 
            typeof window.biometricAnimation.doValidatedBiometricsMatchSameUser === 'function' &&
            window.biometricAnimation.doValidatedBiometricsMatchSameUser();
            
        // Get saved biometric user IDs if available
        let validatedUserIds = null;
        try {
            const storedIds = localStorage.getItem('validatedUserIds');
            if (storedIds) {
                validatedUserIds = JSON.parse(storedIds);
                console.log('[WELCOME ANIMATION] Security check - Biometric user IDs:', JSON.stringify(validatedUserIds));
            }
        } catch (e) {
            console.error('[WELCOME ANIMATION] Error parsing validated user IDs:', e);
        }
        
        // If we have security check function and biometrics don't match same user, block animation
        if (validatedUserIds && Object.values(validatedUserIds).filter(id => id !== null).length > 1) {
            const uniqueUserIds = [...new Set(Object.values(validatedUserIds).filter(id => id !== null))];
            if (uniqueUserIds.length > 1) {
                console.error('[WELCOME ANIMATION] SECURITY ALERT: Animation blocked due to mismatched user biometrics!');
                console.error('[WELCOME ANIMATION] Multiple user IDs detected:', uniqueUserIds.join(', '));
                
                // Record security violation details
                const violationDetails = {
                    timestamp: new Date().toISOString(),
                    component: 'welcome-animation',
                    user_ids: uniqueUserIds,
                    reason: 'Mismatched user IDs detected in welcome animation'
                };
                
                // Store violation in session storage
                sessionStorage.setItem('biometric_security_violation', 'true');
                sessionStorage.setItem('biometric_security_violation_details', JSON.stringify(violationDetails));
                
                // Show security alert notification that we're redirecting
                const errorAlert = document.createElement('div');
                errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-3';
                errorAlert.role = 'alert';
                errorAlert.innerHTML = `
                    <strong>Security Alert!</strong> Biometric validation failed due to identity mismatch.
                    <p>For security reasons, you will be redirected to the home page.</p>
                `;
                document.body.prepend(errorAlert);
                
                // Reset all biometrics to enforce fresh validation
                if (window.biometricAnimation && typeof window.biometricAnimation.resetBiometricValidations === 'function') {
                    window.biometricAnimation.resetBiometricValidations();
                }
                
                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = '/?security_violation=true';
                }, 3000);
                
                return false;
            }
        }
        
        // Store user name
        userName = name;
        
        // Make sure container exists
        if (!animationContainer) {
            createAnimationContainer();
        }
        
        // Clear any existing content
        animationContainer.innerHTML = '';
        
        // Create animation content
        const animationContent = document.createElement('div');
        animationContent.className = 'animation-content';
        
        // Welcome text
        const welcomeText = document.createElement('div');
        welcomeText.className = 'welcome-text';
        welcomeText.innerHTML = 'Welcome back<br/><span class="user-name">' + name + '</span>';
        animationContent.appendChild(welcomeText);
        
        // Car animation
        const carAnimation = document.createElement('div');
        carAnimation.className = 'car-animation';
        
        // Use different car SVG based on vehicle model if provided
        let carSvgSrc = '/static/images/vehicles/audi/animation/car-model.svg';
        if (vehicleModel) {
            const modelMap = {
                'A6': '/static/images/vehicles/audi/animation/a6-model.svg',
                'A7': '/static/images/vehicles/audi/animation/a7-model.svg',
                'Q7': '/static/images/vehicles/audi/animation/q7-model.svg',
                'Q8': '/static/images/vehicles/audi/animation/q8-model.svg',
                'RS': '/static/images/vehicles/audi/animation/rs-model.svg',
                'e-tron': '/static/images/vehicles/audi/animation/etron-model.svg'
            };
            
            // Find a matching model or fallback to generic
            const modelKey = Object.keys(modelMap).find(key => vehicleModel.includes(key));
            if (modelKey) {
                carSvgSrc = modelMap[modelKey];
            }
        }
        
        // Create car SVG container for animation
        const carSvg = document.createElement('img');
        carSvg.src = carSvgSrc;
        carSvg.alt = 'Audi Car Model';
        carSvg.style.width = '100%';
        carAnimation.appendChild(carSvg);
        
        // Add headlights
        const leftLight = document.createElement('div');
        leftLight.className = 'headlights left-light';
        carAnimation.appendChild(leftLight);
        
        const rightLight = document.createElement('div');
        rightLight.className = 'headlights right-light';
        carAnimation.appendChild(rightLight);
        
        animationContent.appendChild(carAnimation);
        
        // Audi rings - using pure CSS approach for better visibility
        const audiRings = document.createElement('div');
        audiRings.className = 'audi-rings';
        
        // Create a larger version of our CSS logo for the welcome animation - proper Audi interlocked rings
        const logoContainer = document.createElement('div');
        logoContainer.className = 'audi-logo';
        logoContainer.style.width = '240px';
        logoContainer.style.height = '60px';
        logoContainer.style.margin = '0 auto 20px auto';
        
        const logoInner = document.createElement('div');
        logoInner.className = 'audi-logo-inner';
        
        // Position settings for interlocked rings
        const positions = [
            { left: '0', zIndex: 2 },
            { left: '40px', zIndex: 1 },
            { left: '80px', zIndex: 2 },
            { left: '120px', zIndex: 1 }
        ];
        
        // Create the four rings - properly interlocked
        for (let i = 1; i <= 4; i++) {
            const ring = document.createElement('div');
            ring.className = `audi-ring audi-ring-${i}`;
            
            // Make rings more visible in animation
            ring.style.width = '50px';
            ring.style.height = '50px';
            ring.style.border = '3px solid white';
            ring.style.boxShadow = '0 0 10px rgba(255,255,255,0.7)';
            ring.style.position = 'absolute';
            ring.style.top = '5px';
            ring.style.left = positions[i-1].left;
            ring.style.zIndex = positions[i-1].zIndex;
            
            logoInner.appendChild(ring);
        }
        
        logoContainer.appendChild(logoInner);
        audiRings.appendChild(logoContainer);
        animationContent.appendChild(audiRings);
        
        // Tagline
        const tagline = document.createElement('div');
        tagline.className = 'tagline';
        tagline.textContent = 'Vorsprung durch Technik';
        animationContent.appendChild(tagline);
        
        // Continue button
        const continueBtn = document.createElement('button');
        continueBtn.className = 'continue-btn';
        continueBtn.textContent = 'Continue';
        continueBtn.addEventListener('click', hideWelcomeAnimation);
        animationContent.appendChild(continueBtn);
        
        // Add content to container
        animationContainer.appendChild(animationContent);
        
        // Show the animation
        animationContainer.style.display = 'flex';
        setTimeout(() => {
            animationContainer.classList.add('visible');
        }, 100);
        
        // Play engine sound effect
        playEngineSound();
        
        // Set auto-hide
        setTimeout(hideWelcomeAnimation, 10000);  // Auto-hide after 10 seconds
    }
    
    /**
     * Play an engine sound effect
     */
    function playEngineSound() {
        try {
            // Create audio element for engine sound
            const engineSound = new Audio('/static/sounds/engine-start.mp3');
            engineSound.volume = 0.5;
            engineSound.play().catch(e => {
                console.log('Engine sound not played: ' + e.message);
            });
        } catch (e) {
            console.error('Error playing engine sound:', e);
        }
    }
    
    /**
     * Hide the welcome animation
     */
    function hideWelcomeAnimation() {
        if (animationContainer) {
            animationContainer.classList.remove('visible');
            setTimeout(() => {
                animationContainer.style.display = 'none';
            }, 500);
        }
    }
    
    // Expose public methods
    window.welcomeAnimation.init = init;
    window.welcomeAnimation.show = showWelcomeAnimation;
    window.welcomeAnimation.hide = hideWelcomeAnimation;
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', init);
})();