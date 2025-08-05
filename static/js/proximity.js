/**
 * Proximity Detection Functionality
 * Handles key proximity and mobile device proximity
 */

// Variables for proximity features
let isBluetoothScanning = false;
let bluetoothDevices = new Map();
let proximityForm = null;

// Initialize proximity features
function initProximityFeatures() {
    proximityForm = document.getElementById('proximity-form');
    const scanBluetoothButton = document.getElementById('scan-bluetooth-button');
    const devicesList = document.getElementById('detected-devices');
    
    if (!proximityForm) {
        console.error('Proximity form not found');
        return;
    }
    
    // Check if Bluetooth is supported
    if (navigator.bluetooth) {
        if (scanBluetoothButton) {
            scanBluetoothButton.addEventListener('click', scanForBluetoothDevices);
        }
    } else {
        // Bluetooth not supported, show message and disable button
        if (scanBluetoothButton) {
            scanBluetoothButton.disabled = true;
            scanBluetoothButton.textContent = 'Bluetooth Not Supported';
        }
        
        const bluetoothWarning = document.getElementById('bluetooth-warning');
        if (bluetoothWarning) {
            bluetoothWarning.textContent = 'Your browser does not support Bluetooth. You will need to enter device information manually.';
            bluetoothWarning.style.display = 'block';
        }
    }
    
    // Setup device selection functionality
    if (devicesList) {
        devicesList.addEventListener('click', function(e) {
            if (e.target && e.target.matches('.use-device-btn')) {
                const deviceId = e.target.getAttribute('data-device-id');
                selectBluetoothDevice(deviceId);
            }
        });
    }
}

// Scan for Bluetooth devices
async function scanForBluetoothDevices() {
    const scanButton = document.getElementById('scan-bluetooth-button');
    const scanningIndicator = document.getElementById('scanning-indicator');
    const devicesList = document.getElementById('detected-devices');
    
    // Clear previous devices list
    if (devicesList) {
        devicesList.innerHTML = '';
    }
    
    // Update UI for scanning
    if (scanButton) {
        scanButton.disabled = true;
        scanButton.textContent = 'Scanning...';
    }
    
    if (scanningIndicator) {
        scanningIndicator.style.display = 'block';
    }
    
    try {
        // We'll try to use real Bluetooth if available
        if (navigator.bluetooth) {
            try {
                // Request Bluetooth devices
                const device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: []
                });
                
                // Add device to our map
                bluetoothDevices.set(device.id, device);
                
                // Add to UI list
                if (devicesList) {
                    addDeviceToList(devicesList, device.id, device.name || 'Unknown Device');
                }
                
                return; // Exit the function if real Bluetooth worked
            } catch (bluetoothError) {
                // If we hit a permissions error, fall through to the simulation
                if (bluetoothError.message && !bluetoothError.message.includes('disallowed by permissions policy')) {
                    throw bluetoothError;
                }
                // Otherwise continue to simulation
                console.log("Using simulated Bluetooth devices due to permission restrictions");
            }
        }
        
        // Simulate finding devices (used when real Bluetooth isn't available)
        // Artificial delay to simulate scanning
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate finding some Audi-specific devices
        const simulatedDevices = [
            { id: 'audi-mm-83f5e2', name: 'Audi MMI 5681' },
            { id: 'audi-key-a12d47', name: 'Audi Digital Key' },
            { id: 'audi-phone-c72e9b', name: 'My Phone' }
        ];
        
        // Add simulated devices to our map and UI
        if (devicesList) {
            simulatedDevices.forEach(device => {
                bluetoothDevices.set(device.id, device);
                addDeviceToList(devicesList, device.id, device.name);
            });
        }
        
    } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'NotFoundError') {
            handleBiometricError(`Bluetooth scan error: ${error.message}`);
        }
    } finally {
        // Reset UI
        if (scanButton) {
            scanButton.disabled = false;
            scanButton.textContent = 'Scan for Devices';
        }
        
        if (scanningIndicator) {
            scanningIndicator.style.display = 'none';
        }
    }
}

// Helper function to add a device to the UI list
function addDeviceToList(devicesList, deviceId, deviceName) {
    const deviceItem = document.createElement('div');
    deviceItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    deviceItem.innerHTML = `
        <div>
            <strong>${deviceName}</strong>
            <br>
            <small class="text-muted">ID: ${deviceId}</small>
        </div>
        <button class="btn btn-sm btn-primary use-device-btn" data-device-id="${deviceId}">
            Use This Device
        </button>
    `;
    devicesList.appendChild(deviceItem);
}

// Select a Bluetooth device to use
function selectBluetoothDevice(deviceId) {
    const device = bluetoothDevices.get(deviceId);
    if (!device) {
        handleBiometricError('Selected device not found');
        return;
    }
    
    // Fill in form fields with device info
    const bluetoothInput = document.getElementById('bluetooth-address');
    if (bluetoothInput) {
        bluetoothInput.value = deviceId;
    }
    
    // Show selected device info
    const selectedDeviceInfo = document.getElementById('selected-device-info');
    if (selectedDeviceInfo) {
        selectedDeviceInfo.textContent = `Selected: ${device.name || 'Unknown Device'} (${deviceId})`;
        selectedDeviceInfo.style.display = 'block';
    }
}

// Generate a unique ID for key proximity
function generateKeyProximityId() {
    const keyIdInput = document.getElementById('key-proximity-id');
    if (!keyIdInput) return;
    
    // Only generate if field is empty
    if (!keyIdInput.value) {
        // Generate a random UUID-like string
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        
        keyIdInput.value = uuid;
    }
}

// Generate a unique ID for mobile proximity
function generateMobileDeviceId() {
    const mobileIdInput = document.getElementById('mobile-device-id');
    if (!mobileIdInput) return;
    
    // Only generate if field is empty
    if (!mobileIdInput.value) {
        // Generate a random UUID-like string
        const uuid = 'mxxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        
        mobileIdInput.value = uuid;
    }
}

// Handle NFC reading (if supported by the browser)
async function setupNfcReading() {
    const nfcButton = document.getElementById('scan-nfc-button');
    const nfcInput = document.getElementById('nfc-tag-id');
    
    if (!nfcButton || !nfcInput) return;
    
    // Enable the button regardless of NFC support for demo purposes
    nfcButton.disabled = false;
    
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
        nfcButton.addEventListener('click', async () => {
            try {
                const ndef = new NDEFReader();
                nfcButton.textContent = 'Tap NFC Tag...';
                
                await ndef.scan();
                
                ndef.addEventListener('reading', ({ serialNumber }) => {
                    // Use the serial number as the NFC ID
                    nfcInput.value = serialNumber;
                    nfcButton.textContent = 'NFC Tag Read';
                    nfcButton.disabled = true;
                    
                    // Show success alert
                    showNfcSuccessMessage(nfcButton, 'NFC tag read successfully!');
                });
            } catch (error) {
                // Fall back to simulation
                simulateNfcScan(nfcButton, nfcInput);
            }
        });
    } else {
        // NFC not supported, but we'll simulate it
        const nfcWarning = document.getElementById('nfc-warning');
        if (nfcWarning) {
            nfcWarning.textContent = 'Your browser does not support NFC reading, but we\'ll simulate it for this demo.';
            nfcWarning.style.display = 'block';
        }
        
        // Add click handler for the simulation
        nfcButton.addEventListener('click', () => {
            simulateNfcScan(nfcButton, nfcInput);
        });
    }
}

// Simulate an NFC scan
async function simulateNfcScan(nfcButton, nfcInput) {
    // Change button state
    nfcButton.textContent = 'Scanning...';
    nfcButton.disabled = true;
    
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a simulated NFC ID
    const simulatedNfcIds = [
        'audi-nfc-tag-59162a',
        'audi-card-key-7d8e2f',
        'audi-connect-d9c43b'
    ];
    
    const randomNfcId = simulatedNfcIds[Math.floor(Math.random() * simulatedNfcIds.length)];
    nfcInput.value = randomNfcId;
    
    // Update UI
    nfcButton.textContent = 'NFC Tag Read';
    
    // Show success message
    showNfcSuccessMessage(nfcButton, 'Simulated NFC tag detected!');
}

// Helper to show NFC success message
function showNfcSuccessMessage(nfcButton, message) {
    // Show success alert
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success mt-3';
    successAlert.textContent = message;
    nfcButton.parentNode.appendChild(successAlert);
    
    // Remove alert after 3 seconds
    setTimeout(() => {
        successAlert.remove();
        nfcButton.disabled = false;
        nfcButton.textContent = 'Scan Again';
    }, 3000);
}

// Initialize on page load if on proximity setup page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('proximity-setup-container')) {
        initProximityFeatures();
        
        // Setup key ID generation
        const generateKeyIdButton = document.getElementById('generate-key-id-button');
        if (generateKeyIdButton) {
            generateKeyIdButton.addEventListener('click', generateKeyProximityId);
        }
        
        // Setup mobile ID generation
        const generateMobileIdButton = document.getElementById('generate-mobile-id-button');
        if (generateMobileIdButton) {
            generateMobileIdButton.addEventListener('click', generateMobileDeviceId);
        }
        
        // Setup NFC reading if supported
        setupNfcReading();
    }
});
