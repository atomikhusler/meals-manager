// js/app.js
import { validateLicense } from './auth.js';
import { initDB } from './database.js';
import { initTheme, initNavigation } from './ui-layout.js';
import { initDateControls, renderDailyList } from './ui-daily.js';
import { initDirectory, renderDirectoryList } from './ui-directory.js';
import { initToolsAndSummary } from './export.js';

// ==========================================
// ADMIN CONFIGURATION (Tweak these for your setup)
// ==========================================
// 💡 HINT: Change this to a unique string. You will subscribe to this exact topic in your ntfy app.
const ADMIN_NTFY_TOPIC = "meals_manager_skr_2026_927630"; 

// 💡 HINT: Your Telegram support group deep link domain (without @)
const TELEGRAM_SUPPORT_GROUP = "https://t.me/+aK5HSD9lKJhkYTI1"; 

async function bootApp() {
    initTheme();
    
    const splash = document.getElementById('splash-screen');
    const gate = document.getElementById('activation-gate');
    
    // Check for existing valid license
    const savedName = localStorage.getItem('mm_admin_name');
    const savedPhone = localStorage.getItem('mm_admin_phone');
    const savedKey = localStorage.getItem('mm_license_key');
    
    const isLicensed = savedName && savedPhone && savedKey && validateLicense(savedName, savedPhone, savedKey);

    // Premium 1.5s delay
    setTimeout(() => {
        if (isLicensed) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                loadMainApp();
            }, 500);
        } else {
            gate.style.display = 'flex';
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                initActivationGate();
            }, 500);
        }
    }, 1500);
}

function initActivationGate() {
    const nameInput = document.getElementById('auth-name');
    const phoneInput = document.getElementById('auth-phone');
    const btnRequest = document.getElementById('btn-request-key');
    const statusText = document.getElementById('auth-status-text');
    
    let eventSource = null;

    // 1. The Serverless Auto-Read Request
    btnRequest.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (!name || !phone) return alert("Please enter your Name and Mobile Number first.");
        
        // Generate a unique temporary listening channel for this device
        const deviceId = `device_${Math.random().toString(36).substring(2, 8)}`;
        
        // Update UI
        btnRequest.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-black inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending Request...`;
        btnRequest.disabled = true;

        // Send silent HTTP POST to Admin's ntfy topic
        try {
            await fetch(`https://ntfy.sh/${ADMIN_NTFY_TOPIC}`, {
                method: 'POST',
                headers: { 'Title': 'New Activation Request' },
                body: `Name: ${name}\nMobile: ${phone}\nReply Topic: ${deviceId}`
            });
            
            btnRequest.innerHTML = `<svg class="animate-pulse -ml-1 mr-2 h-4 w-4 text-blue-500 inline-block" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Awaiting Code...`;
            statusText.classList.remove('hidden');

        } catch (error) {
            alert("Network error. Could not send request. Check your internet connection.");
            btnRequest.innerHTML = "Request Activation Key";
            btnRequest.disabled = false;
            return;
        }

        // Open Server-Sent Events (SSE) Listener on the temporary topic
        if (eventSource) eventSource.close();
        eventSource = new EventSource(`https://ntfy.sh/${deviceId}/sse`);
        
        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.event === 'message') {
                const receivedCode = data.message.trim();
                
                // Validate incoming message immediately
                if (validateLicense(name, phone, receivedCode)) {
                    eventSource.close(); 
                    localStorage.setItem('mm_admin_name', name);
                    localStorage.setItem('mm_admin_phone', phone);
                    localStorage.setItem('mm_license_key', receivedCode);
                    
                    // Visual confirmation
                    btnRequest.innerHTML = "Activation Successful!";
                    btnRequest.classList.replace('bg-gray-900', 'bg-green-500');
                    btnRequest.classList.replace('dark:bg-white', 'bg-green-500');
                    btnRequest.classList.remove('dark:text-black');
                    btnRequest.classList.add('text-white');
                    statusText.classList.add('hidden');
                    
                    setTimeout(() => window.location.reload(), 1500);
                }
            }
        };
    });

    // 2. Manual Verify Fallback (If they close the app while waiting)
    document.getElementById('btn-verify-key').addEventListener('click', () => {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const key = document.getElementById('auth-key').value.trim();
        
        if (!name || !phone || !key) return alert("Fill all fields.");
        
        if (validateLicense(name, phone, key)) {
            if (eventSource) eventSource.close();
            localStorage.setItem('mm_admin_name', name);
            localStorage.setItem('mm_admin_phone', phone);
            localStorage.setItem('mm_license_key', key);
            window.location.reload(); 
        } else {
            alert("Invalid Key. Check your details and try again.");
        }
    });

    // 3. Telegram Support Deep Link
    document.getElementById('btn-tg-support').addEventListener('click', () => {
        window.open(TELEGRAM_SUPPORT_GROUP, '_blank');
    });
}

// Normal Boot Sequence
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
            if (targetTabId === 'view-directory') {
                renderDirectoryList();
            }
            if (targetTabId === 'view-attendance') {
                const dateInput = document.getElementById('input-date');
                if (dateInput) renderDailyList(dateInput.value);
            }
        });
    } catch (error) {
        console.error("Boot Failed:", error);
        alert("System boot failed. Check console.");
    }
}

window.addEventListener('DOMContentLoaded', bootApp);
