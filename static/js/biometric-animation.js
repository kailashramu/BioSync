/**
 * Biometric Animation Script
 * 
 * This script handles the car door opening animation that appears
 * when multiple biometrics are successfully validated.
 */

// Retrieve validated biometrics from localStorage or initialize
let validatedBiometrics = JSON.parse(localStorage.getItem('validatedBiometrics')) || {
    face: false,
    voice: false,
    retina: false,
    proximity: false
};

// Track which biometrics were validated in the current session
// This helps us only show animation when multiple biometrics are validated in sequence
let sessionValidations = JSON.parse(localStorage.getItem('sessionValidations')) || {
    face: false,
    voice: false,
    retina: false,
    proximity: false
};

// Track the user IDs associated with each biometric validation
// This ensures we only open the door when biometrics match the same user
let validatedUserIds = JSON.parse(localStorage.getItem('validatedUserIds')) || {
    face: null,
    voice: null,
    retina: null,
    proximity: null
};

// Log initial state
console.log('Initial validated biometrics state:', JSON.stringify(validatedBiometrics));
console.log('Current session validations:', JSON.stringify(sessionValidations));

// Function to check if all validated biometrics belong to the same user
function doValidatedBiometricsMatchSameUser() {
    // Get all user IDs from validations that have been done
    const userIds = Object.entries(validatedUserIds)
        .filter(([type, userId]) => validatedBiometrics[type] && userId !== null)
        .map(([type, userId]) => userId);
    
    // If we have no validations or only one, no need to check matching
    if (userIds.length <= 1) {
        return true;
    }
    
    // Check if all user IDs are the same
    const firstUserId = userIds[0];
    const allMatch = userIds.every(userId => {
        // Convert to string for consistent comparison (server might return numbers, client might store strings)
        return String(userId) === String(firstUserId);
    });
    
    console.log(`User ID validation check: ${allMatch ? 'All biometrics match the same user' : 'Biometrics belong to different users!'}`);
    console.log(`User IDs from biometrics: [${userIds.join(',')}]`);
    
    if (!allMatch) {
        console.log('Biometrics belong to different users. Door will not open!');
        
        // Store security violation in sessionStorage to allow pages to display appropriate alerts
        sessionStorage.setItem('biometric_security_violation', 'true');
        sessionStorage.setItem('biometric_security_mismatch_ids', JSON.stringify(userIds));
    }
    
    return allMatch;
}

// Track if animation is currently visible
let animationVisible = false;

// Function to count total validated biometrics
function countValidatedBiometrics() {
    let count = 0;
    for (const type in validatedBiometrics) {
        if (validatedBiometrics[type]) {
            count++;
        }
    }
    return count;
}

// Count session validations
function countSessionValidations() {
    return Object.values(sessionValidations).filter(Boolean).length;
}

// Set a specific biometric as validated and store the user ID
function setBiometricValidated(type, isValidated = true, userId = null) {
    if (typeof validatedBiometrics[type] !== 'undefined') {
        console.log(`Setting biometric ${type} validation status to: ${isValidated}`);
        
        // Check if this is a new validation in this session
        const isNewSessionValidation = !sessionValidations[type] && isValidated;
        
        // Update validation statuses
        validatedBiometrics[type] = isValidated;
        if (isValidated) {
            sessionValidations[type] = true;
            
            // Store the user ID for this biometric type
            if (userId !== null) {
                validatedUserIds[type] = userId;
                // Save user IDs to localStorage
                localStorage.setItem('validatedUserIds', JSON.stringify(validatedUserIds));
                console.log(`Saved user ID ${userId} for biometric type ${type}`);
            }
        } else {
            // Reset user ID if validation is set to false
            validatedUserIds[type] = null;
            localStorage.setItem('validatedUserIds', JSON.stringify(validatedUserIds));
        }
        
        // Save both states to localStorage
        localStorage.setItem('validatedBiometrics', JSON.stringify(validatedBiometrics));
        localStorage.setItem('sessionValidations', JSON.stringify(sessionValidations));
        console.log('Saved biometric state to localStorage');
        
        // Check if we have multiple validations
        const validCount = countValidatedBiometrics();
        const sessionCount = countSessionValidations();
        console.log(`Biometric validation count: ${validCount}`);
        console.log(`Session validation count: ${sessionCount}`);
        console.log(`Validated biometrics: ${JSON.stringify(validatedBiometrics)}`);
        console.log(`Session validations: ${JSON.stringify(sessionValidations)}`);
        
        // Get each validated biometric and its user ID
        const validatedBiometricDetails = Object.entries(validatedBiometrics)
            .filter(([type, isValid]) => isValid)
            .map(([type, isValid]) => ({
                type,
                userId: validatedUserIds[type]
            }));
        
        // Log detailed validation status for debugging
        console.log('Validation details:', JSON.stringify(validatedBiometricDetails));
            
        // Check if biometrics belong to the same user (with detailed logging)
        const doUsersMatch = doValidatedBiometricsMatchSameUser();
        console.log(`Security check result: Biometrics ${doUsersMatch ? 'MATCH the same user' : 'belong to DIFFERENT users'}`);
        
        // Only show animation if:
        // 1. We have 2+ validations 
        // 2. Animation isn't already visible
        // 3. This validation is new in this session (prevents animation on repeated validation)
        // 4. We have validated at least 2 biometrics in this session
        // 5. All validated biometrics belong to the same user (ENHANCED CHECK)
        // 6. All user IDs are non-null and match the same value
        if (validCount >= 2 && 
            !animationVisible && 
            isNewSessionValidation && 
            sessionCount >= 2 && 
            doUsersMatch) {
            
            console.log('Multiple NEW biometrics validated for the same user in this session, showing animation');
            
            // Get the consistent user ID from validations (we know they all match at this point)
            const consistentUserId = validatedBiometricDetails.length > 0 ? validatedBiometricDetails[0].userId : null;
            console.log(`All biometrics matched for user ID: ${consistentUserId}`);
            
            // Show car door animation with consistent security
            showCarDoorAnimation();
        } else if (validCount >= 2 && !doUsersMatch) {
            console.log('SECURITY VIOLATION: Biometrics belong to different users. Door will not open!');
            
            // Log the validation mismatch details for security auditing
            const userIdsByType = {};
            Object.keys(validatedBiometrics)
                .filter(type => validatedBiometrics[type])
                .forEach(type => {
                    userIdsByType[type] = validatedUserIds[type];
                });
            
            console.error('Security violation details - Mismatched biometric user IDs:', JSON.stringify(userIdsByType));
            
            // Store security violation in sessionStorage
            sessionStorage.setItem('biometric_security_violation', 'true');
            sessionStorage.setItem('biometric_security_violation_details', JSON.stringify(userIdsByType));
            
            // Show a notification that we're redirecting for security reasons
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-3';
            errorAlert.role = 'alert';
            errorAlert.innerHTML = `
                <strong>Security Alert!</strong> Biometric validations don't match the same user. Access denied.
                <p>For security reasons, you will be redirected to the home page.</p>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            const container = document.querySelector('.container') || document.body;
            container.prepend(errorAlert);
            
            // Reset all biometrics to clear the invalid state
            resetBiometricValidations();
            
            // Redirect to home page after a short delay (3 seconds)
            setTimeout(() => {
                window.location.href = '/?security_violation=true';
            }, 3000);
        } else {
            // Log detailed reason why animation isn't shown
            const reasons = [];
            if (validCount < 2) reasons.push('Not enough validated biometrics');
            if (animationVisible) reasons.push('Animation already visible');
            if (!isNewSessionValidation) reasons.push('Not a new validation in this session');
            if (sessionCount < 2) reasons.push('Not enough biometrics validated in current session');
            if (!doUsersMatch && validCount >= 2) reasons.push('Biometrics belong to different users');
            
            console.log(`Not showing animation: ${reasons.join(', ')}`);
        }
    } else {
        console.error(`Unknown biometric type: ${type}`);
    }
}

// Reset all biometric validations
function resetBiometricValidations() {
    // Reset all validation statuses
    for (const type in validatedBiometrics) {
        validatedBiometrics[type] = false;
    }
    
    // Reset session validations too
    for (const type in sessionValidations) {
        sessionValidations[type] = false;
    }
    
    // Reset user IDs
    for (const type in validatedUserIds) {
        validatedUserIds[type] = null;
    }
    
    // Reset animation state
    animationVisible = false;
    
    // Update localStorage
    localStorage.setItem('validatedBiometrics', JSON.stringify(validatedBiometrics));
    localStorage.setItem('sessionValidations', JSON.stringify(sessionValidations));
    localStorage.setItem('validatedUserIds', JSON.stringify(validatedUserIds));
    
    // Also clear user data and welcome animation flag
    localStorage.removeItem('validatedUserData');
    sessionStorage.removeItem('has_shown_biometric_welcome');
    
    console.log('Reset all biometric validations, session data, and welcome animation data');
}

// Reset just the session validations (keep overall validation status)
function resetSessionValidations() {
    // Reset session validations
    for (const type in sessionValidations) {
        sessionValidations[type] = false;
    }
    
    // Update localStorage
    localStorage.setItem('sessionValidations', JSON.stringify(sessionValidations));
    
    // Also reset welcome animation flag to allow showing it again
    sessionStorage.removeItem('has_shown_biometric_welcome');
    console.log('Reset session validations and welcome animation flag');
}

// Set a session-specific validation (this won't persist across browser sessions)
function setSessionValidation(type, isValidated = true) {
    if (typeof sessionValidations[type] !== 'undefined') {
        sessionValidations[type] = isValidated;
        
        // Update localStorage
        localStorage.setItem('sessionValidations', JSON.stringify(sessionValidations));
        console.log(`Set session validation for ${type} to ${isValidated}`);
        
        return true;
    }
    return false;
}

// Add the animation container to the page
function createAnimationContainer() {
    if (document.getElementById('biometric-animation-container')) {
        return; // Container already exists
    }
    
    const container = document.createElement('div');
    container.id = 'biometric-animation-container';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
    `;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.classList.add('btn', 'btn-outline-light', 'position-absolute');
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.innerHTML = '<i class="bi bi-x-lg"></i>';
    closeButton.addEventListener('click', hideCarDoorAnimation);
    
    // Add animation SVG container
    const svgContainer = document.createElement('div');
    svgContainer.id = 'car-door-animation';
    svgContainer.style.cssText = `
        width: 80%;
        max-width: 800px;
        margin-bottom: 20px;
    `;
    
    // Add user info container
    const userInfo = document.createElement('div');
    userInfo.id = 'animation-user-info';
    userInfo.classList.add('text-center', 'text-white', 'mt-4');
    
    // Assemble container
    container.appendChild(closeButton);
    container.appendChild(svgContainer);
    container.appendChild(userInfo);
    document.body.appendChild(container);
}

// Show the car door animation
function showCarDoorAnimation(userName = null) {
    // Force a new security check: Extra protection layer to ensure all validated biometrics match
    // This is a redundant check to ensure multiple biometric types (face, retina, voice) all belong to the same user
    const securityCheck = doValidatedBiometricsMatchSameUser();
    
    // Get all biometric types that have been validated
    const validatedTypes = Object.keys(validatedBiometrics).filter(type => validatedBiometrics[type]);
    console.log('Security check before animation - Validated types:', validatedTypes.join(', '));
    
    // Get the user IDs for each validated biometric
    const biometricUserIds = validatedTypes.map(type => validatedUserIds[type]);
    console.log('Security check before animation - User IDs:', biometricUserIds.join(', '));
    
    // Security check: only show animation if all validated biometrics belong to the same user
    if (!securityCheck || biometricUserIds.some(id => id !== biometricUserIds[0])) {
        console.error('SECURITY ALERT: Car door animation blocked due to mismatched user biometrics!');
        
        // Record the mismatch for security audit
        const mismatchInfo = {
            timestamp: new Date().toISOString(),
            validated_types: validatedTypes,
            user_ids: biometricUserIds,
            reason: 'Biometric user ID mismatch detected during animation'
        };
        console.error('Security violation details:', JSON.stringify(mismatchInfo));
        
        // Store security violation in session storage
        sessionStorage.setItem('biometric_security_violation', 'true');
        sessionStorage.setItem('biometric_security_violation_details', JSON.stringify(mismatchInfo));
        
        // Show a notification that we're redirecting for security reasons
        const errorMsg = `
            <div class="alert alert-danger biometric-mismatch-alert" style="position: fixed; top: 20%; left: 50%; transform: translateX(-50%); z-index: 2000; max-width: 500px; box-shadow: 0 0 15px rgba(0,0,0,0.5);">
                <div class="d-flex">
                    <div class="me-3">
                        <i class="bi bi-exclamation-triangle-fill fs-1"></i>
                    </div>
                    <div>
                        <h4>Security Alert: Biometric Mismatch</h4>
                        <p>The biometric validations don't match the same user identity.</p>
                        <p>For security reasons, you will be redirected to the home page.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add error to body
        const errorContainer = document.createElement('div');
        errorContainer.innerHTML = errorMsg;
        document.body.appendChild(errorContainer.firstElementChild);
        
        // Reset all biometrics to clear the invalid state
        resetBiometricValidations();
        
        // Redirect to home page after a short delay (3 seconds)
        setTimeout(() => {
            // Remove any visible alert before redirecting
            const alert = document.querySelector('.biometric-mismatch-alert');
            if (alert) alert.remove();
            
            // Redirect to home with security violation parameter
            window.location.href = '/?security_violation=true';
        }, 3000);
        
        return false;
    }
    
    createAnimationContainer();
    
    // Get the container
    const container = document.getElementById('biometric-animation-container');
    const svgContainer = document.getElementById('car-door-animation');
    const userInfo = document.getElementById('animation-user-info');
    
    // Make it visible
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
    animationVisible = true;
    
    // Load the animation SVG
    fetch('/static/images/vehicles/audi/animation/car-doors.svg')
        .then(response => response.text())
        .then(svgText => {
            svgContainer.innerHTML = svgText;
            
            // Set username if available
            if (userName) {
                const welcomeText = document.querySelector('.welcome-text');
                if (welcomeText) {
                    welcomeText.textContent = `Welcome, ${userName}!`;
                }
            }
            
            // Trigger animations after a short delay
            setTimeout(() => {
                const leftDoor = document.querySelector('.left-door');
                const rightDoor = document.querySelector('.right-door');
                const userSilhouette = document.querySelector('.user-silhouette');
                const welcomeTexts = document.querySelectorAll('.welcome-text');
                
                if (leftDoor) leftDoor.classList.add('animate');
                if (rightDoor) rightDoor.classList.add('animate');
                if (userSilhouette) userSilhouette.classList.add('animate');
                welcomeTexts.forEach(text => text.classList.add('animate'));
                
                // Auto-transition to welcome animation after door animation completes
                setTimeout(() => {
                    // Hide car door animation first
                    hideCarDoorAnimation();
                    
                    // Check if welcome animation is available
                    if (window.welcomeAnimation && typeof window.welcomeAnimation.show === 'function') {
                        // Only show if we haven't shown it already in this session
                        const hasShownWelcome = sessionStorage.getItem('has_shown_biometric_welcome');
                        
                        if (!hasShownWelcome) {
                            // Get user data from localStorage (this data may be from a previous validation)
                            let userData = null;
                            try {
                                const storedData = localStorage.getItem('validatedUserData');
                                if (storedData) {
                                    userData = JSON.parse(storedData);
                                    console.log('Using stored validation data for welcome animation:', userData);
                                }
                            } catch (e) {
                                console.error('Error parsing stored user data:', e);
                            }
                            
                            // If we have window.validatedUserData directly, prioritize that
                            if (window.validatedUserData) {
                                userData = window.validatedUserData;
                                console.log('Using window validation data for welcome animation:', userData);
                            }
                            
                            // Get vehicle data if available
                            let vehicleModel = null;
                            let ownerName = userName || 'User';
                            
                            if (userData && userData.vehicles && userData.vehicles.length > 0) {
                                const vehicle = userData.vehicles[0];
                                vehicleModel = `${vehicle.make} ${vehicle.model}`;
                                console.log('Using vehicle model for animation:', vehicleModel);
                                
                                if (userData.user && userData.user.name) {
                                    ownerName = userData.user.name;
                                    console.log('Using owner name for animation:', ownerName);
                                }
                            } else {
                                console.warn('No vehicle or user data available for welcome animation');
                            }
                            
                            // Show personalized welcome
                            console.log('Showing welcome animation with name:', ownerName, 'and vehicle:', vehicleModel);
                            window.welcomeAnimation.show(ownerName, vehicleModel);
                            
                            // Mark as shown to prevent repeated animations
                            sessionStorage.setItem('has_shown_biometric_welcome', 'true');
                        } else {
                            console.log('Welcome animation already shown in this session');
                        }
                    } else {
                        console.warn('Welcome animation function not available');
                    }
                }, 5000); // Show welcome animation after 5 seconds (after car door animation completes)
                
                // Display user information if available
                if (window.validatedUserData) {
                    const userData = window.validatedUserData;
                    let userInfoHTML = '';
                    
                    if (userData.user && userData.user.name) {
                        userInfoHTML += `<h3 class="mb-3">${userData.user.name}</h3>`;
                    }
                    
                    if (userData.user && userData.user.email) {
                        userInfoHTML += `<p class="text-muted mb-3">${userData.user.email}</p>`;
                    }
                    
                    // Add validated biometrics info
                    const validatedTypes = [];
                    for (const type in validatedBiometrics) {
                        if (validatedBiometrics[type]) {
                            validatedTypes.push(formatBiometricType(type));
                        }
                    }
                    
                    if (validatedTypes.length > 0) {
                        userInfoHTML += `
                            <div class="mt-2 mb-3">
                                <p class="text-success">
                                    <i class="bi bi-check-circle-fill me-2"></i>
                                    Verified with ${validatedTypes.join(' & ')}
                                </p>
                            </div>
                        `;
                    }
                    
                    // Add vehicle information if available
                    if (userData.vehicles && userData.vehicles.length > 0) {
                        userInfoHTML += `<div class="mt-3">
                            <h5 class="mb-3">Associated Vehicles</h5>
                            <div class="row justify-content-center">`;
                        
                        userData.vehicles.forEach(vehicle => {
                            userInfoHTML += `
                                <div class="col-md-4 mb-3">
                                    <div class="card bg-dark text-white">
                                        <div class="card-body">
                                            <h6>${vehicle.year} ${vehicle.make} ${vehicle.model}</h6>
                                            <p class="small text-muted mb-1">Color: ${vehicle.color || 'Not specified'}</p>
                                            <p class="small text-muted mb-0">Plate: ${vehicle.license_plate || 'Not specified'}</p>
                                            <a href="/vehicles/details/${vehicle.id}" class="btn btn-sm btn-outline-light mt-2">
                                                View Details
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                        
                        userInfoHTML += `</div></div>`;
                    }
                    
                    userInfo.innerHTML = userInfoHTML;
                    
                    // Fade in user info
                    setTimeout(() => {
                        userInfo.style.opacity = '1';
                    }, 1000);
                }
            }, 500);
        });
}

// Hide the car door animation
function hideCarDoorAnimation() {
    const container = document.getElementById('biometric-animation-container');
    if (container) {
        console.log('Hiding car door animation');
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        
        // Clean up after animation
        setTimeout(() => {
            const svgContainer = document.getElementById('car-door-animation');
            if (svgContainer) {
                svgContainer.innerHTML = '';
            }
            
            const userInfo = document.getElementById('animation-user-info');
            if (userInfo) {
                userInfo.innerHTML = '';
            }
            
            animationVisible = false;
            console.log('Animation hidden and cleaned up');
            
            // Reset biometric validations - optional, uncomment if you want to reset after viewing
            // resetBiometricValidations();
        }, 300);
    }
}

// Format biometric type for display
function formatBiometricType(type) {
    const typeMap = {
        face: 'Facial Recognition',
        voice: 'Voice Recognition',
        retina: 'Retina Scan',
        proximity: 'Proximity Key'
    };
    
    return typeMap[type] || type;
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    createAnimationContainer();
    
    // Check if we already have multiple biometrics validated
    const validCount = countValidatedBiometrics();
    console.log(`Initial biometric validation count on page load: ${validCount}`);
    
    // Get session validations
    const storedSessionValidations = localStorage.getItem('sessionValidations');
    let sessionValidations = { face: false, voice: false, retina: false, proximity: false };
    if (storedSessionValidations) {
        try {
            sessionValidations = JSON.parse(storedSessionValidations);
        } catch (e) {
            console.error('Error parsing session validations:', e);
        }
    }
    
    // Count session validations
    const sessionCount = Object.values(sessionValidations).filter(Boolean).length;
    console.log(`Session validation count on page load: ${sessionCount}`);
    
    // We only show animation on page load if:
    // 1. We have 2+ biometrics validated overall 
    // 2. Animation isn't already visible
    // 3. We have 2+ biometrics validated in this session
    if (validCount >= 2 && !animationVisible && sessionCount >= 2) {
        console.log('Multiple biometrics validated in this session, showing animation on page load');
        
        // Small delay to ensure the page is fully loaded
        setTimeout(() => {
            showCarDoorAnimation();
        }, 500);
    } else {
        console.log(`Not showing animation on page load: validCount=${validCount}, sessionCount=${sessionCount}`);
    }
});

// Export functions for use in other scripts
window.biometricAnimation = {
    setBiometricValidated,
    setSessionValidation,
    showCarDoorAnimation,
    hideCarDoorAnimation,
    resetBiometricValidations,
    resetSessionValidations,
    getValidatedBiometrics: () => validatedBiometrics,
    isValidated: (type) => validatedBiometrics[type] === true,
    getValidatedCount: countValidatedBiometrics,
    // Expose security checks to other components
    doValidatedBiometricsMatchSameUser,
    getValidatedUserIds: () => JSON.parse(JSON.stringify(validatedUserIds)) // Return a copy to prevent direct modifications
};