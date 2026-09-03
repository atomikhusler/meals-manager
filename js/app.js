// js/app.js
import { initDB } from './database.js';
import { initTheme, initNavigation } from './ui-layout.js';
import { initDateControls, renderDailyList } from './ui-daily.js';
import { initDirectory, renderDirectoryList } from './ui-directory.js';
import { initToolsAndSummary } from './export.js';
import {
    getOrCreateDeviceId,
    verifyLicenseStatus,
    requestActivation,
    listenForActivationApproval
} from './auth.js';

let realtimeSubscription = null;

async function bootApp() {
    initTheme();
    const splash = document.getElementById('splash-screen');
    const gate = document.getElementById('activation-gate');

    const localLicensed = localStorage.getItem('mm_license_valid') === 'true';
    const status = await verifyLicenseStatus();

    setTimeout(() => {
        // Allow access if active or offline with prior verification
        if ((status === 'APPROVED' && localLicensed) || status === 'OFFLINE_APPROVED') {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                loadMainApp();
            }, 400);
        } else {
            // Revoked, pending, or unregistered
            if (status === 'REVOKED') localStorage.removeItem('mm_license_valid');
            
            gate.style.display = 'flex';
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                initActivationGate(status);
            }, 400);
        }
    }, 1200);
}

function initActivationGate(currentStatus) {
    const nameInput = document.getElementById('auth-name');
    const phoneInput = document.getElementById('auth-phone');
    const btnRequest = document.getElementById('btn-request-key');
    const statusText = document.getElementById('auth-status-text');
    const deviceId = getOrCreateDeviceId();

    // Render device reference badge
    const shortId = deviceId.substring(0, 8).toUpperCase();
    let badge = document.getElementById('did-ref-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'did-ref-badge';
        badge.className = "text-center py-1 mb-2 font-mono text-xs text-gray-400 dark:text-gray-500";
        badge.innerHTML = `Device Ref: <span class="text-gray-800 dark:text-gray-200 font-bold tracking-wider">${shortId}</span>`;
        const container = document.querySelector('#activation-gate .space-y-4');
        if (container) container.insertBefore(badge, container.firstChild);
    }

    if (currentStatus === 'PENDING') {
        btnRequest.innerHTML = "Awaiting Admin Approval...";
        btnRequest.disabled = true;
        statusText.classList.remove('hidden');
        startRealtimeListener();
    }

    btnRequest.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!name || !phone) {
            alert("Please enter Name and Mobile.");
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
                setTimeout(() => window.location.reload(), 800);
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
        setTimeout(() => window.location.reload(), 1000);
    });
}

async function loadMainApp() {
    try {
        await initDB();
        initDateControls();
        initDirectory();
        initToolsAndSummary();
        renderDirectoryList();

        initNavigation((targetTabId) => {
            if (targetTabId === 'view-summary') {
                const monthInput = document.getElementById('input-summary-month');
                if (monthInput) monthInput.dispatchEvent(new Event('change'));
            }
            if (targetTabId === 'view-directory') renderDirectoryList();
            if (targetTabId === 'view-attendance') {
                const dateInput = document.getElementById('input-date');
                if (dateInput) renderDailyList(dateInput.value);
            }
        });
    } catch (error) {
        console.error("Boot Failed:", error);
    }
}

window.addEventListener('DOMContentLoaded', bootApp);
