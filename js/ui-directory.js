// js/ui-directory.js
import { addMember, getAllMembers, updateMemberStatus, deleteMember } from './database.js';
import { renderDailyList } from './ui-daily.js';

let isFormVisible = false;

function getLocalTodayString() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return (new Date(today - offset)).toISOString().split('T')[0];
}

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
}

function getInitials(name) {
    return name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export function initDirectory() {
    const toggleBtn = document.getElementById('btn-show-add-form');
    const formContainer = document.getElementById('directory-form-container');

    toggleBtn.addEventListener('click', (e) => {
        isFormVisible = !isFormVisible;
        const icon = toggleBtn.querySelector('svg');
        
        if (isFormVisible) {
            icon.style.transform = 'rotate(45deg)';
            icon.style.transition = 'transform 0.2s ease';
            formContainer.innerHTML = `
                <div class="px-4 pb-6 animate-fade-in">
                    <div class="bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-lg">
                        <div class="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800/50">
                            <input type="text" id="add-name" placeholder="Full Name (e.g., John Doe)" class="w-full bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none placeholder-gray-400">
                        </div>
                        <div class="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800/50 flex">
                            <input type="text" id="add-room" placeholder="Room" class="w-1/3 bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none placeholder-gray-400 border-r border-gray-100 dark:border-gray-800/50">
                            <input type="tel" id="add-phone" placeholder="WhatsApp (10 digits)" class="w-2/3 bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none placeholder-gray-400 pl-3">
                        </div>
                        <button id="btn-submit-member" class="w-full bg-blue-600 dark:bg-blue-600 text-white font-black text-sm py-4 active:bg-blue-700 transition-colors text-center tracking-wide">
                            Save Member
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('btn-submit-member').addEventListener('click', async () => {
                const nameInput = document.getElementById('add-name').value.trim();
                const roomInput = document.getElementById('add-room').value.trim();
                const phoneInput = document.getElementById('add-phone').value.trim();

                if (!nameInput || !/^[a-zA-Z0-9\s]+$/.test(nameInput)) return alert("Enter a valid alphanumeric name.");
                if (!/^\d{10}$/.test(phoneInput)) return alert("Mobile number must be exactly 10 digits.");

                await addMember(nameInput, roomInput, phoneInput);
                
                isFormVisible = false;
                formContainer.innerHTML = '';
                icon.style.transform = 'rotate(0deg)';
                
                renderDirectoryList();
                renderDailyList(getLocalTodayString());
            });
        } else {
            icon.style.transform = 'rotate(0deg)';
            formContainer.innerHTML = '';
        }
    });
}

export async function renderDirectoryList() {
    const list = document.getElementById('directory-list');
    list.className = "flex flex-col gap-3 px-4 pb-4"; // Spaced out layout
    const members = await getAllMembers();
    
    list.innerHTML = '';
    if (members.length === 0) {
        // Premium Empty State
        list.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div class="w-20 h-20 bg-gray-50 dark:bg-[#1a1a1c] rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-800">
                    <svg class="text-gray-300 dark:text-gray-600" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                </div>
                <h3 class="text-gray-900 dark:text-white font-bold text-base mb-1">Roster is Empty</h3>
                <p class="text-gray-400 text-xs font-medium max-w-[200px]">Tap "Add Member" above to start building your directory.</p>
            </div>
        `;
        return;
    }

    // Sort A-Z strictly as requested
    members.sort((a, b) => a.name.localeCompare(b.name));

    members.forEach(m => {
        const isActive = m.status === 'ACTIVE';
        const rowOpacity = isActive ? 'opacity-100' : 'opacity-50 grayscale bg-gray-50 dark:bg-[#111]';
        const toggleBg = isActive ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700';
        const togglePillTranslate = isActive ? 'translate-x-5' : 'translate-x-0';
        
        const div = document.createElement('div');
        // Distinct, Fitts's Law tactile cards
        div.className = `p-4 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors ${rowOpacity}`;
        
        div.innerHTML = `
            <div class="flex items-center gap-3 flex-1 pr-3 truncate">
                <div class="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-inner shrink-0" style="background-color: ${getAvatarColor(m.name)};">
                    ${getInitials(m.name)}
                </div>
                <div class="flex-1 truncate">
                    <div class="font-bold text-sm text-gray-900 dark:text-white truncate">${m.name}</div>
                    <div class="text-[11px] font-bold text-gray-400 mt-0.5 tracking-wide">
                        Rm ${m.room || 'N/A'} &bull; ${m.phone}
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-4 shrink-0">
                <button class="status-toggle w-11 h-6 rounded-full flex items-center transition-colors duration-300 px-0.5 ${toggleBg}" data-id="${m.id}" data-status="${m.status}">
                    <div class="w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${togglePillTranslate}"></div>
                </button>
                <button class="delete-btn p-2 text-gray-400 hover:text-red-500 active:scale-90 transition-all rounded-lg bg-gray-50 dark:bg-[#111]" data-id="${m.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </div>
        `;
        list.appendChild(div);
    });

    attachDirectoryListeners(list);
}

function attachDirectoryListeners(listElement) {
    listElement.querySelectorAll('.status-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            const newStatus = btn.getAttribute('data-status') === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            const pill = btn.querySelector('div');
            
            if (newStatus === 'ACTIVE') {
                btn.classList.replace('bg-gray-200', 'bg-green-500');
                btn.classList.replace('dark:bg-gray-700', 'bg-green-500');
                pill.classList.replace('translate-x-0', 'translate-x-5');
            } else {
                btn.classList.replace('bg-green-500', 'bg-gray-200');
                if(document.documentElement.classList.contains('dark')) btn.classList.replace('bg-gray-200', 'dark:bg-gray-700');
                pill.classList.replace('translate-x-5', 'translate-x-0');
            }
            btn.setAttribute('data-status', newStatus);

            await updateMemberStatus(parseInt(btn.getAttribute('data-id')), newStatus);
            renderDirectoryList();
            renderDailyList(getLocalTodayString());
        });
    });

    listElement.querySelectorAll('.delete-btn').forEach(btn => {
        let confirmTimeout;
        btn.addEventListener('click', async () => {
            if (!btn.classList.contains('armed')) {
                btn.classList.add('armed', 'animate-pulse');
                btn.classList.replace('text-gray-400', 'text-red-600');
                btn.classList.replace('bg-gray-50', 'bg-red-50');
                btn.classList.replace('dark:bg-[#111]', 'dark:bg-red-900/30');
                
                confirmTimeout = setTimeout(() => {
                    btn.classList.remove('armed', 'animate-pulse');
                    btn.classList.replace('text-red-600', 'text-gray-400');
                    btn.classList.replace('bg-red-50', 'bg-gray-50');
                    btn.classList.replace('dark:bg-red-900/30', 'dark:bg-[#111]');
                }, 3000);
            } else {
                clearTimeout(confirmTimeout);
                await deleteMember(parseInt(btn.getAttribute('data-id')));
                renderDirectoryList();
                renderDailyList(getLocalTodayString());
            }
        });
    });
}
