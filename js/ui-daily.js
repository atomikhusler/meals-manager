// js/ui-daily.js
import { getAllMembers, getDayRecords, saveMealRecord } from './database.js';

// State Persistence: Keeps track of the date without resetting to "Today" on tab switch
let currentDate = getLocalTodayString();

function getLocalTodayString() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return (new Date(today - offset)).toISOString().split('T')[0];
}

const THEMES = {
    'OFF': 'bg-gray-100 dark:bg-[#1c1c1e] text-gray-400 dark:text-gray-500',
    'RICE': 'bg-blue-600 text-white shadow-md font-bold',
    'NORICE': 'bg-orange-500 text-white shadow-md font-bold'
};

export function initDateControls() {
    renderDateHero();
    const inputDate = document.getElementById('input-date');
    
    // Ensure the hidden input matches our persisted date
    inputDate.value = currentDate;
    
    inputDate.addEventListener('change', (e) => {
        currentDate = e.target.value;
        updateDateDisplay();
        renderDailyList(currentDate);
    });

    const btnPrev = document.getElementById('btn-prev-day');
    const btnNext = document.getElementById('btn-next-day');
    const newBtnPrev = btnPrev.cloneNode(true);
    const newBtnNext = btnNext.cloneNode(true);
    btnPrev.parentNode.replaceChild(newBtnPrev, btnPrev);
    btnNext.parentNode.replaceChild(newBtnNext, btnNext);

    newBtnPrev.addEventListener('click', () => changeDate(-1));
    newBtnNext.addEventListener('click', () => changeDate(1));

    renderDailyList(currentDate);
    attachListListeners();
}

function renderDateHero() {
    const container = document.getElementById('date-hero-container');
    container.innerHTML = `
        <div class="flex items-center justify-between bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 rounded-2xl p-2 mb-4 shadow-sm transition-colors">
            <button id="btn-prev-day" class="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#111] text-gray-500 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div class="flex-1 text-center relative cursor-pointer" onclick="document.getElementById('input-date').showPicker()">
                <div class="text-lg font-black text-gray-900 dark:text-white tracking-tight" id="display-date-main">Today</div>
                <div class="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5" id="display-date-sub"></div>
                <input type="date" id="input-date" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
            </div>
            <button id="btn-next-day" class="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#111] text-gray-500 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
        </div>
        
        <div id="kitchen-dashboard" class="grid grid-cols-2 gap-3 pb-2 border-b border-gray-100 dark:border-gray-900 mb-5"></div>
    `;
    updateDateDisplay();
}

function changeDate(days) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    currentDate = d.toISOString().split('T')[0];
    document.getElementById('input-date').value = currentDate;
    updateDateDisplay();
    renderDailyList(currentDate);
}

function updateDateDisplay() {
    const d = new Date(currentDate);
    const todayStr = getLocalTodayString();
    document.getElementById('display-date-main').innerText = (currentDate === todayStr) ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    document.getElementById('display-date-sub').innerText = d.toLocaleDateString('en-US', { year: 'numeric' });
}

function updateDashboard(records, members) {
    let dR = 0, dN = 0, nR = 0, nN = 0;
    // For the dashboard, we only count members who are globally ACTIVE or have a meal today
    // Time-Travel Logic applied to Dashboard metrics
    const relevantMemberIds = members.map(m => m.id); 

    records.forEach(r => {
        if (!relevantMemberIds.includes(r.memberId)) return;
        const member = members.find(m => m.id === r.memberId);
        
        // Count it if they are active OR if they have a meal logged (historical accuracy)
        if (member && (member.status === 'ACTIVE' || (r.day !== 'OFF' || r.night !== 'OFF'))) {
            if (r.day === 'RICE') dR++;
            if (r.day === 'NORICE') dN++;
            if (r.night === 'RICE') nR++;
            if (r.night === 'NORICE') nN++;
        }
    });

    const dash = document.getElementById('kitchen-dashboard');
    dash.innerHTML = `
        <div class="bg-white dark:bg-[#1a1a1c] p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center items-center">
            <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><span class="text-yellow-500 text-sm">☀️</span> Day</div>
            <div class="text-2xl font-black text-blue-600 dark:text-blue-500 leading-none mb-1">${dR + dN}</div>
            <div class="text-[9px] font-bold text-gray-500 tracking-wider">RICE ${dR} &bull; NO ${dN}</div>
        </div>
        <div class="bg-white dark:bg-[#1a1a1c] p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center items-center">
            <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><span class="text-indigo-400 text-sm">🌙</span> Night</div>
            <div class="text-2xl font-black text-blue-600 dark:text-blue-500 leading-none mb-1">${nR + nN}</div>
            <div class="text-[9px] font-bold text-gray-500 tracking-wider">RICE ${nR} &bull; NO ${nN}</div>
        </div>
    `;
}

export async function renderDailyList(dateString) {
    const container = document.getElementById('attendance-list');
    
    // Tweak: Reduced container gap from gap-4 to gap-3 for tighter density
    container.className = "px-3 flex flex-col gap-3"; 
    container.innerHTML = '<div class="text-center text-sm text-gray-400 py-10 font-bold">Loading...</div>';

    const members = await getAllMembers();
    const records = await getDayRecords(dateString);
    updateDashboard(records, members);

    if (members.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div class="w-16 h-16 bg-gray-50 dark:bg-[#1a1a1c] rounded-2xl flex items-center justify-center mb-3 border border-gray-100 dark:border-gray-800 transform rotate-3">
                    <svg class="text-gray-300 dark:text-gray-600" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                </div>
                <h3 class="text-gray-900 dark:text-white font-bold text-sm mb-1">No Active Roster</h3>
                <p class="text-gray-400 text-[11px] font-medium max-w-[200px]">Head over to the Directory to add members.</p>
            </div>
        `;
        return;
    }

    // Sort A-Z strictly
    members.sort((a, b) => a.name.localeCompare(b.name));

    const recordMap = {};
    records.forEach(r => recordMap[r.memberId] = r);
    container.innerHTML = ''; 

    members.forEach(member => {
        const rec = recordMap[member.id] || { day: 'OFF', night: 'OFF' };
        
        // 🚀 TIME-TRAVEL LOGIC
        // If they are INACTIVE, but have a meal recorded on this specific date, UN-GRAY them so the admin can see history.
        const hasMealLogged = (rec.day !== 'OFF' || rec.night !== 'OFF');
        const isVisuallyActive = (member.status === 'ACTIVE' || hasMealLogged);
        
        const rowOpacity = isVisuallyActive ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none hidden-view'; // hidden-view class hides totally dead historical cards to save space
        
        // Don't clutter the screen with deactivated people who have no meals on this date
        if (!isVisuallyActive) return;

        const statusBadge = member.status === 'ACTIVE' ? '' : `<span class="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded ml-2 uppercase font-black tracking-widest">Inactive</span>`;

        const card = document.createElement('div');
        // Tweak: Compact p-3.5 padding instead of p-5
        card.className = `bg-white dark:bg-[#1a1a1c] p-3.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all ${rowOpacity}`;
        
        card.innerHTML = `
            <div class="flex justify-between items-center border-b border-gray-50 dark:border-gray-900/50 pb-2.5 mb-2.5">
                <div class="flex items-center truncate pr-2">
                    <span class="font-bold text-gray-900 dark:text-white text-sm truncate">${member.name}</span>
                    ${statusBadge}
                </div>
                <span class="text-[9px] bg-gray-100 dark:bg-[#111] px-2 py-1 rounded-md text-gray-500 font-bold uppercase tracking-wider shrink-0">Rm ${member.room || 'N/A'}</span>
            </div>
            
            <div class="flex flex-col gap-2"> <!-- Tweak: tighter vertical gap -->
                <div class="flex items-center gap-2">
                    <div class="w-10 flex items-center justify-end gap-1 text-[9px] font-black text-gray-400 tracking-widest uppercase">
                        <span class="text-yellow-500 text-xs">☀️</span> Day
                    </div>
                    <div class="flex flex-1 bg-gray-50 dark:bg-[#111] p-1 rounded-xl gap-1 border border-gray-100 dark:border-gray-800">
                        ${createButton(member.id, 'day', 'OFF', rec.day, 'OFF')}
                        ${createButton(member.id, 'day', 'RICE', rec.day, 'RICE')}
                        ${createButton(member.id, 'day', 'NORICE', rec.day, 'NO')}
                    </div>
                </div>
                
                <div class="flex items-center gap-2">
                    <div class="w-10 flex items-center justify-end gap-1 text-[9px] font-black text-gray-400 tracking-widest uppercase">
                        <span class="text-indigo-400 text-xs">🌙</span> Ngt
                    </div>
                    <div class="flex flex-1 bg-gray-50 dark:bg-[#111] p-1 rounded-xl gap-1 border border-gray-100 dark:border-gray-800">
                        ${createButton(member.id, 'night', 'OFF', rec.night, 'OFF')}
                        ${createButton(member.id, 'night', 'RICE', rec.night, 'RICE')}
                        ${createButton(member.id, 'night', 'NORICE', rec.night, 'NO')}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function createButton(memberId, time, targetValue, currentValue, label) {
    const isActive = targetValue === currentValue;
    const themeClass = isActive ? THEMES[targetValue] : THEMES['OFF'];
    // Tweak: Slimmer py-2 buttons and text-[10px]
    return `<button class="flex-1 py-2 text-[10px] font-black rounded-lg transition-all duration-200 meal-btn ${themeClass}" data-member="${memberId}" data-time="${time}" data-val="${targetValue}">${label}</button>`;
}

let listenerAttached = false;

function attachListListeners() {
    if (listenerAttached) return;
    listenerAttached = true;
    
    document.getElementById('attendance-list').addEventListener('click', async (e) => {
        const btn = e.target.closest('.meal-btn');
        if (!btn) return;

        const memberId = btn.getAttribute('data-member');
        const timeOfDay = btn.getAttribute('data-time');
        const clickedVal = btn.getAttribute('data-val');
        
        const wrapper = btn.parentElement;
        const currentActiveBtn = wrapper.querySelector('.shadow-md') || wrapper.querySelector('[data-val="OFF"]');
        const currentVal = currentActiveBtn.getAttribute('data-val');

        let nextVal = clickedVal;
        if (clickedVal === currentVal) {
            const STATES = ['OFF', 'RICE', 'NORICE'];
            nextVal = STATES[(STATES.indexOf(currentVal) + 1) % STATES.length];
        }

        Array.from(wrapper.children).forEach(b => {
            b.className = `flex-1 py-2 text-[10px] font-black rounded-lg transition-all duration-200 meal-btn ${THEMES['OFF']}`;
        });
        wrapper.querySelector(`[data-val="${nextVal}"]`).className = `flex-1 py-2 text-[10px] font-black rounded-lg transition-all duration-200 meal-btn ${THEMES[nextVal]}`;

        await saveMealRecord(currentDate, memberId, timeOfDay, nextVal);
        const records = await getDayRecords(currentDate);
        const members = await getAllMembers();
        updateDashboard(records, members);
    });
}
