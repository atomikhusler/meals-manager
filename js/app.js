// js/app.js
import { initDB } from './database.js';
import { initDateControls, initDirectory, renderDirectoryList } from './ui.js';
import { initToolsAndSummary } from './export.js';

// ==========================================
// 1. THEME ENGINE (Dark/Light Mode)
// ==========================================
function initTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('btn-theme-toggle');
    const iconDark = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');

    // Check local storage or OS preference
    let isDark = localStorage.getItem('theme') === 'dark';
    if (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true;
    }

    function applyTheme() {
        if (isDark) {
            html.classList.add('dark');
            iconDark.classList.add('hidden');
            iconLight.classList.remove('hidden');
        } else {
            html.classList.remove('dark');
            iconDark.classList.remove('hidden');
            iconLight.classList.add('hidden');
        }
    }

    // Toggle on click
    btn.addEventListener('click', () => {
        isDark = !isDark;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        applyTheme();
    });

    applyTheme();
}

// ==========================================
// 2. CROSS-DEVICE NAVIGATION ENGINE
// ==========================================
function initNavigation() {
    const mobileBtns = document.querySelectorAll('.nav-btn-mobile');
    const desktopBtns = document.querySelectorAll('.nav-btn-desktop');
    const views = document.querySelectorAll('.view-section');
    const headerTitle = document.getElementById('header-view-title');

    function switchTab(targetId, title) {
        // Hide all views
        views.forEach(v => v.classList.add('hidden-view'));
        
        // Remove active states
        mobileBtns.forEach(b => b.classList.remove('active'));
        desktopBtns.forEach(b => b.classList.remove('active'));

        // Show target
        document.getElementById(targetId).classList.remove('hidden-view');
        
        // Sync active states on both desktop and mobile buttons
        const targetMobile = document.querySelector(`.nav-btn-mobile[data-target="${targetId}"]`);
        const targetDesktop = document.querySelector(`.nav-btn-desktop[data-target="${targetId}"]`);
        
        if (targetMobile) targetMobile.classList.add('active');
        if (targetDesktop) targetDesktop.classList.add('active');

        // Update PC header title
        if(headerTitle) headerTitle.innerText = title;

        // Auto-trigger data refreshes based on the tab selected
        if (targetId === 'view-summary') {
            document.getElementById('btn-generate').click();
        }
        if (targetId === 'view-directory') {
            renderDirectoryList();
        }
    }

    // Attach to mobile buttons
    mobileBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const title = btn.innerText.replace(/[^a-zA-Z\s]/g, '').trim();
            switchTab(btn.getAttribute('data-target'), title);
        });
    });

    // Attach to desktop buttons
    desktopBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const title = btn.innerText.replace(/[^a-zA-Z\s]/g, '').trim();
            switchTab(btn.getAttribute('data-target'), title);
        });
    });
}

// ==========================================
// 3. APP BOOTSTRAP (The Master Startup)
// ==========================================
async function bootApp() {
    // 1. Initialize Theme immediately to prevent white flashes
    initTheme();
    
    try {
        // 2. Boot the Local Database
        await initDB();
        
        // 3. Initialize all modular engines
        initNavigation();         // Hooks up Tab switching
        initDateControls();       // Hooks up Daily view and renders today's list
        initDirectory();          // Hooks up "Add Member" form & validation
        initToolsAndSummary();    // Hooks up PDF/Excel Export & Summary logic
        
        // 4. Pre-render the directory in the background
        renderDirectoryList();
        
        // Default the month picker to the current month
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const currentMonth = (new Date(today - offset)).toISOString().substring(0, 7);
        document.getElementById('input-month').value = currentMonth;

    } catch (error) {
        console.error("Boot Failed:", error);
        alert("Failed to access local database. Ensure you aren't in private browsing mode or out of storage.");
    }
}

// Fire the sequence when the HTML is fully loaded
window.addEventListener('DOMContentLoaded', bootApp);