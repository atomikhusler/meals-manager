// js/app.js
import { 
    verifyLicenseStatus, 
    requestActivation, 
    listenForActivationApproval,
    getOrCreateDeviceId,
    studentLogin,
    getStudentSession
} from './auth.js';

let realtimeSubscription = null;

// ==========================================
// 1. MASTER BOOT SEQUENCE
// ==========================================
async function bootApp() {
    const splash = document.getElementById('splash-screen');
    const authContainer = document.getElementById('auth-container');
    const bootStatus = document.getElementById('boot-status');

    // Only run this routing logic on the index.html page
    if (!authContainer) return; 

    try {
        // Step 1: Check for Hardware-Locked Manager License
        bootStatus.innerText = "Verifying Hardware Lock...";
        const status = await verifyLicenseStatus();

        if (status === 'APPROVED' || status === 'OFFLINE_APPROVED') {
            window.location.replace('portal-manager.html');
            return; // Stop execution, redirecting
        }

        // Step 2: Check for Frictionless Student Session
        bootStatus.innerText = "Checking User Sessions...";
        const studentSession = getStudentSession();
        
        if (studentSession) {
            window.location.replace('portal-student.html');
            return; // Stop execution, redirecting
        }

        // Step 3: No valid sessions found. Reveal the Login UI.
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.classList.add('hidden');
            authContainer.classList.remove('hidden');
            authContainer.classList.add('flex');
            
            // If the manager previously requested access, default to their pending screen
            if (status === 'PENDING') {
                document.getElementById('toggle-to-manager').click();
                initActivationGate('PENDING');
            } else {
                initActivationGate('UNREGISTERED');
            }
            
            initStudentLogin();
        }, 500);

    } catch (error) {
        console.error("Boot Failed:", error);
        alert("Boot failure: Please check your internet connection.");
    }
}

// ==========================================
// 2. MANAGER ACTIVATION LOGIC (Hardware Lock)
// ==========================================
function initActivationGate(currentStatus) {
    const nameInput = document.getElementById('auth-name');
    const phoneInput = document.getElementById('auth-phone');
    const btnRequest = document.getElementById('btn-request-key');
    const statusText = document.getElementById('auth-status-text');
    const deviceId = getOrCreateDeviceId();

    // Display Device Reference ID
    const shortId = deviceId.substring(0, 8).toUpperCase();
    document.getElementById('did-ref-container').innerHTML = `Device Ref: <span class="text-gray-800 dark:text-gray-200 font-bold tracking-wider">${shortId}</span>`;

    // Handle Pending State
    if (currentStatus === 'PENDING') {
        btnRequest.innerHTML = "Awaiting Admin Approval...";
        btnRequest.disabled = true;
        statusText.classList.remove('hidden');
        startRealtimeListener();
    }

    // Submit Request
    btnRequest.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!name || !phone) {
            alert("Please enter Manager Name and Mobile.");
            return;
        }

        btnRequest.innerHTML = "Registering device...";
        btnRequest.disabled = true;

        try {
            const res = await requestActivation(name, phone);
            if (res.status === 'APPROVED') {
                localStorage.setItem('mm_license_valid', 'true');
                btnRequest.innerHTML = "Activation Approved!";
                btnRequest.classList.replace('bg-gray-900', 'bg-emerald-600');
                setTimeout(() => window.location.replace('portal-manager.html'), 800);
                return;
            }

            btnRequest.innerHTML = "Awaiting Admin Approval...";
            statusText.classList.remove('hidden');
            startRealtimeListener();
        } catch (err) {
            alert("Activation Error: " + err.message);
            btnRequest.innerHTML = "Request Activation";
            btnRequest.disabled = false;
        }
    });
}

function startRealtimeListener() {
    if (realtimeSubscription) return;
    const btnRequest = document.getElementById('btn-request-key');

    realtimeSubscription = listenForActivationApproval(() => {
        btnRequest.innerHTML = "Activation Successful!";
        btnRequest.classList.replace('bg-gray-900', 'bg-emerald-600');
        setTimeout(() => window.location.replace('portal-manager.html'), 1000);
    });
}

// ==========================================
// 3. STUDENT LOGIN LOGIC (Frictionless Auth)
// ==========================================
function initStudentLogin() {
    const btnLogin = document.getElementById('btn-student-login');
    const codeInput = document.getElementById('student-mess-code');
    const phoneInput = document.getElementById('student-phone');
    const pinInput = document.getElementById('student-pin');

    btnLogin.addEventListener('click', async () => {
        const messCode = codeInput.value.trim();
        const phone = phoneInput.value.trim();
        const pin = pinInput.value.trim();

        if (!messCode || !phone || !pin) {
            alert("Please fill in all fields.");
            return;
        }

        btnLogin.innerHTML = `<span class="animate-pulse">Logging in...</span>`;
        btnLogin.disabled = true;

        try {
            const res = await studentLogin(messCode, phone, pin);
            if (res.success) {
                btnLogin.innerHTML = "Login Successful!";
                btnLogin.classList.replace('bg-blue-600', 'bg-emerald-600');
                setTimeout(() => window.location.replace('portal-student.html'), 800);
            }
        } catch (err) {
            alert("Login Failed: " + err.message);
            btnLogin.innerHTML = "Login securely";
            btnLogin.disabled = false;
        }
    });
}

// Boot the App Engine when DOM is ready
window.addEventListener('DOMContentLoaded', bootApp);
