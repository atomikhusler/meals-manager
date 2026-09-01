// js/ui-layout.js

export function initTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('btn-theme-toggle');
    const iconDark = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');

    let isDark = localStorage.getItem('theme') === 'dark';
    if (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true;
    }

    function applyTheme() {
        if (isDark) {
            html.classList.add('dark');
            iconDark.classList.remove('hidden');
            iconLight.classList.add('hidden');
        } else {
            html.classList.remove('dark');
            iconDark.classList.add('hidden');
            iconLight.classList.remove('hidden');
        }
    }

    btn.addEventListener('click', () => {
        isDark = !isDark;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        applyTheme();
    });

    applyTheme();
}

export function initNavigation(onTabSwitchCallback) {
    const mobileBtns = document.querySelectorAll('.nav-btn-mobile');
    const desktopBtns = document.querySelectorAll('.nav-btn-desktop');
    const views = document.querySelectorAll('.view-section');
    const headerTitlePC = document.getElementById('header-view-title');
    const headerTitleMobile = document.getElementById('header-view-title-mobile');

    function switchTab(targetId, title) {
        // Hide all views
        views.forEach(v => v.classList.add('hidden-view'));
        
        // Reset Mobile SVGs (Muted color, normal stroke)
        mobileBtns.forEach(b => {
            b.classList.remove('active', 'text-gray-900', 'dark:text-white');
            b.classList.add('text-gray-400', 'dark:text-gray-600');
            const icon = b.querySelector('.nav-icon');
            if (icon) {
                icon.classList.remove('stroke-[2.5px]');
                icon.classList.add('stroke-2');
            }
        });
        
        // Reset Desktop buttons
        desktopBtns.forEach(b => {
            b.classList.remove('active', 'bg-gray-200', 'dark:bg-gray-800');
        });

        // Show selected view
        document.getElementById(targetId).classList.remove('hidden-view');
        
        // Apply active SVG styling to Mobile
        const targetMobile = document.querySelector(`.nav-btn-mobile[data-target="${targetId}"]`);
        if (targetMobile) {
            targetMobile.classList.add('active', 'text-gray-900', 'dark:text-white');
            targetMobile.classList.remove('text-gray-400', 'dark:text-gray-600');
            const icon = targetMobile.querySelector('.nav-icon');
            if (icon) {
                icon.classList.remove('stroke-2');
                icon.classList.add('stroke-[2.5px]');
            }
        }
        
        // Apply active styling to Desktop
        const targetDesktop = document.querySelector(`.nav-btn-desktop[data-target="${targetId}"]`);
        if (targetDesktop) {
            targetDesktop.classList.add('active', 'bg-gray-200', 'dark:bg-gray-800');
        }

        // Update Headers securely
        if (headerTitlePC) headerTitlePC.innerText = title;
        if (headerTitleMobile) headerTitleMobile.innerText = title;

        // Trigger dynamic data fetch in app.js
        if (typeof onTabSwitchCallback === 'function') {
            onTabSwitchCallback(targetId);
        }
    }

    // Bind listeners
    mobileBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-target'), btn.querySelector('span').innerText));
    });

    desktopBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-target'), btn.innerText.trim()));
    });
}
