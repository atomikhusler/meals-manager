// js/ui.js
import { getAllMembers, getDayRecords, saveMealRecord, addMember, updateMemberStatus, deleteMember } from './database.js';

let currentDate = getLocalTodayString();

// Helper to prevent timezone midnight bugs
function getLocalTodayString() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return (new Date(today - offset)).toISOString().split('T')[0];
}

const THEMES = {
    'OFF': 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium',
    'RICE': 'bg-blue-600 text-white shadow-lg font-black',
    'NORICE': 'bg-orange-500 text-white shadow-lg font-black'
};

// ==========================================
// 1. MASSIVE DATE HERO CONTROLS
// ==========================================
export function initDateControls() {
    const inputDate = document.getElementById('input-date');
    inputDate.value = currentDate;
    updateDateDisplay(currentDate);

    inputDate.addEventListener('change', (e) => {
        currentDate = e.target.value;
        updateDateDisplay(currentDate);
        renderDailyList(currentDate);
    });

    document.getElementById('btn-prev-day').addEventListener('click', () => changeDate(-1));
    document.getElementById('btn-next-day').addEventListener('click', () => changeDate(1));

    // Initial load
    renderDailyList(currentDate);
    attachListListeners();
}

function changeDate(days) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    currentDate = d.toISOString().split('T')[0];
    document.getElementById('input-date').value = currentDate;
    updateDateDisplay(currentDate);
    renderDailyList(currentDate);
}

function updateDateDisplay(dateStr) {
    const d = new Date(dateStr);
    const todayStr = getLocalTodayString();
    document.getElementById('display-date-main').innerText = (dateStr === todayStr) ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'long' });
    document.getElementById('display-date-sub').innerText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ==========================================
// 2. DAILY DASHBOARD & LIST RENDERER
// ==========================================
function updateDashboard(records, members) {
    let dR = 0, dN = 0, nR = 0, nN = 0;
    
    // Only count active members to prevent ghost data from inactive/deleted members
    const activeMemberIds = members.filter(m => m.status === 'ACTIVE').map(m => m.id);

    records.forEach(r => {
        if (!activeMemberIds.includes(r.memberId)) return;
        if (r.day === 'RICE') dR++;
        if (r.day === 'NORICE') dN++;
        if (r.night === 'RICE') nR++;
        if (r.night === 'NORICE') nN++;
    });

    document.getElementById('dash-day-total').innerText = dR + dN;
    document.getElementById('dash-day-rice').innerText = dR;
    document.getElementById('dash-day-norice').innerText = dN;

    document.getElementById('dash-night-total').innerText = nR + nN;
    document.getElementById('dash-night-rice').innerText = nR;
    document.getElementById('dash-night-norice').innerText = nN;
}

export async function renderDailyList(dateString) {
    const container = document.getElementById('attendance-list');
    container.innerHTML = '<p class="text-center text-gray-400 py-10 font-bold">Loading...</p>';

    const members = await getAllMembers();
    const records = await getDayRecords(dateString);
    updateDashboard(records, members);

    if (members.length === 0) {
        container.innerHTML = `<div class="bg-white dark:bg-gray-800 p-8 rounded-3xl text-center shadow-sm border border-gray-100 dark:border-gray-700"><p class="text-gray-500 dark:text-gray-400">No members found. Add them in Directory.</p></div>`;
        return;
    }

    const recordMap = {};
    records.forEach(r => recordMap[r.memberId] = r);
    container.innerHTML = ''; 

    members.forEach(member => {
        const rec = recordMap[member.id] || { day: 'OFF', night: 'OFF' };
        const isActive = member.status === 'ACTIVE';
        
        // Grey out inactive members entirely and block pointer events
        const rowOpacity = isActive ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none';
        const statusBadge = isActive ? '' : `<span class="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 px-2 py-1 rounded ml-2 uppercase font-black tracking-widest">Inactive</span>`;

        const row = document.createElement('div');
        row.className = `bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col space-y-5 transition-all ${rowOpacity}`;
        row.innerHTML = `
            <div class="flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-3">
                <div class="flex items-center">
                    <span class="font-black text-gray-900 dark:text-white text-xl">${member.name}</span>
                    ${statusBadge}
                </div>
                <span class="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider">Rm ${member.room || 'N/A'}</span>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                    <div class="text-[10px] font-black text-gray-400 mb-2 tracking-widest uppercase">☀️ Day</div>
                    <div class="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl gap-1">
                        ${createButton(member.id, 'day', 'OFF', rec.day)}
                        ${createButton(member.id, 'day', 'RICE', rec.day)}
                        ${createButton(member.id, 'day', 'NORICE', rec.day)}
                    </div>
                </div>
                <div class="flex-1">
                    <div class="text-[10px] font-black text-gray-400 mb-2 tracking-widest uppercase">🌙 Night</div>
                    <div class="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl gap-1">
                        ${createButton(member.id, 'night', 'OFF', rec.night)}
                        ${createButton(member.id, 'night', 'RICE', rec.night)}
                        ${createButton(member.id, 'night', 'NORICE', rec.night)}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(row);
    });
}

function createButton(memberId, time, targetValue, currentValue) {
    const isActive = targetValue === currentValue;
    const themeClass = isActive ? THEMES[targetValue] : THEMES['OFF'];
    const label = targetValue === 'NORICE' ? 'NO RICE' : targetValue;
    return `<button class="flex-1 py-3 sm:py-4 text-xs sm:text-sm rounded-xl transition-all duration-200 meal-btn ${themeClass}" data-member="${memberId}" data-time="${time}" data-val="${targetValue}">${label}</button>`;
}

// ==========================================
// 3. EVENT DELEGATION (Smart Clicks)
// ==========================================
function attachListListeners() {
    document.getElementById('attendance-list').addEventListener('click', async (e) => {
        const btn = e.target.closest('.meal-btn');
        if (!btn) return;

        const memberId = btn.getAttribute('data-member');
        const timeOfDay = btn.getAttribute('data-time');
        const clickedVal = btn.getAttribute('data-val');
        
        const wrapper = btn.parentElement;
        const currentActiveBtn = wrapper.querySelector('.shadow-lg') || wrapper.querySelector('[data-val="OFF"]');
        const currentVal = currentActiveBtn.getAttribute('data-val');

        let nextVal = clickedVal;
        if (clickedVal === currentVal) {
            const STATES = ['OFF', 'RICE', 'NORICE'];
            nextVal = STATES[(STATES.indexOf(currentVal) + 1) % STATES.length];
        }

        // Visually update immediately
        Array.from(wrapper.children).forEach(b => {
            b.className = `flex-1 py-3 sm:py-4 text-xs sm:text-sm rounded-xl transition-all duration-200 meal-btn ${THEMES['OFF']}`;
        });
        wrapper.querySelector(`[data-val="${nextVal}"]`).className = `flex-1 py-3 sm:py-4 text-xs sm:text-sm rounded-xl transition-all duration-200 meal-btn ${THEMES[nextVal]}`;

        // Save to DB and recalculate dashboard
        await saveMealRecord(currentDate, memberId, timeOfDay, nextVal);
        const records = await getDayRecords(currentDate);
        const members = await getAllMembers();
        updateDashboard(records, members);
    });
}

// ==========================================
// 4. DIRECTORY ENGINE (Validation & Toggles)
// ==========================================
export function initDirectory() {
    document.getElementById('btn-add-member').addEventListener('click', async () => {
        const nameInput = document.getElementById('add-name').value.trim();
        const roomInput = document.getElementById('add-room').value.trim();
        const phoneInput = document.getElementById('add-phone').value.trim();

        if (!nameInput || !/^[a-zA-Z0-9\s]+$/.test(nameInput)) return alert("Enter a valid alphanumeric name.");
        if (!/^\d{10}$/.test(phoneInput)) return alert("Mobile number must be exactly 10 digits.");

        await addMember(nameInput, roomInput, phoneInput);
        document.getElementById('add-name').value = '';
        document.getElementById('add-room').value = '';
        document.getElementById('add-phone').value = '';
        
        renderDirectoryList();
        renderDailyList(currentDate);
    });
}

export async function renderDirectoryList() {
    const list = document.getElementById('directory-list');
    const members = await getAllMembers();
    
    list.innerHTML = '';
    if (members.length === 0) {
        list.innerHTML = '<p class="text-sm text-gray-400 py-4 text-center">No members yet.</p>';
        return;
    }

    members.forEach(m => {
        const isActive = m.status === 'ACTIVE';
        const statusColor = isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
        
        const div = document.createElement('div');
        div.className = `bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors ${!isActive ? 'opacity-75' : ''}`;
        
        div.innerHTML = `
            <div class="flex-1">
                <div class="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    ${m.name} 
                    <span class="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-black ${statusColor}">${m.status}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">Rm: ${m.room || 'N/A'} &bull; Mob: ${m.phone}</div>
            </div>
            <div class="flex items-center gap-2">
                <button class="status-toggle flex-1 sm:flex-none text-xs font-bold border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-gray-600 dark:text-gray-300 active:scale-95 transition-transform" data-id="${m.id}" data-status="${m.status}">
                    ${isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button class="delete-btn flex-1 sm:flex-none text-xs font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg px-4 py-2.5 border border-red-100 dark:border-red-800 transition-all" data-id="${m.id}">
                    🗑️ Delete
                </button>
            </div>
        `;
        list.appendChild(div);
    });

    // Attach Listeners for Activate/Deactivate
    list.querySelectorAll('.status-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            const newStatus = btn.getAttribute('data-status') === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await updateMemberStatus(parseInt(btn.getAttribute('data-id')), newStatus);
            renderDirectoryList();
            renderDailyList(currentDate);
        });
    });

    // Attach Listeners for Double-Confirm Delete
    list.querySelectorAll('.delete-btn').forEach(btn => {
        let confirmTimeout;
        btn.addEventListener('click', async () => {
            if (btn.innerText.includes('Delete')) {
                // First click: Ask for confirmation
                btn.innerText = '⚠️ Sure?';
                btn.classList.replace('bg-red-50', 'bg-red-500');
                btn.classList.replace('dark:bg-red-900/30', 'dark:bg-red-600');
                btn.classList.replace('text-red-600', 'text-white');
                btn.classList.replace('dark:text-red-400', 'dark:text-white');
                
                // Reset back to normal after 3 seconds if not clicked again
                confirmTimeout = setTimeout(() => {
                    btn.innerText = '🗑️ Delete';
                    btn.classList.replace('bg-red-500', 'bg-red-50');
                    btn.classList.replace('dark:bg-red-600', 'dark:bg-red-900/30');
                    btn.classList.replace('text-white', 'text-red-600');
                    btn.classList.replace('dark:text-white', 'dark:text-red-400');
                }, 3000);
            } else {
                // Second click: Execute delete
                clearTimeout(confirmTimeout);
                await deleteMember(parseInt(btn.getAttribute('data-id')));
                renderDirectoryList();
                renderDailyList(currentDate);
            }
        });
    });
}