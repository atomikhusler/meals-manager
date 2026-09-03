// js/export.js
import { getAllMembers, getMonthRecords, getExportData, restoreExportData, clearDatabase } from './database.js';
import { downloadExcel, printPDF } from './file-export.js';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================
function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
}

function getInitials(name) {
    if (!name) return "NA";
    return name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function formatDisplayMonth(monthStr) {
    if (!monthStr) return "Unknown Month";
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ==========================================
// 2. INITIALIZATION & LISTENERS
// ==========================================
export function initToolsAndSummary() {
    const currentMonth = new Date().toISOString().substring(0, 7);
    renderSummaryHeader(currentMonth);
    
    // Connects perfectly to your new file-export.js
    document.getElementById('btn-export-csv').addEventListener('click', async () => await downloadExcel());
    document.getElementById('btn-print').addEventListener('click', () => printPDF());
    document.getElementById('btn-backup-json').addEventListener('click', backupData);
    document.getElementById('file-restore').addEventListener('change', restoreData);
    
    const btnReset = document.getElementById('btn-factory-reset');
    let resetTimeout;
    btnReset.addEventListener('click', async () => {
        const span = btnReset.querySelector('span');
        if (span.innerText === 'Factory Reset App') {
            span.innerText = 'Tap again to WIPE ALL DATA';
            span.classList.replace('text-red-600', 'text-white');
            btnReset.classList.replace('bg-white', 'bg-red-600');
            btnReset.classList.replace('dark:bg-black', 'dark:bg-red-600');
            
            resetTimeout = setTimeout(() => {
                span.innerText = 'Factory Reset App';
                span.classList.replace('text-white', 'text-red-600');
                btnReset.classList.replace('bg-red-600', 'bg-white');
                btnReset.classList.replace('dark:bg-red-600', 'dark:bg-black');
            }, 4000);
        } else {
            clearTimeout(resetTimeout);
            await clearDatabase();
            localStorage.clear();
            window.location.reload();
        }
    });
}

// ==========================================
// 3. SMART LEDGER UI ENGINE (Crash-Proof)
// ==========================================
async function renderSummaryHeader(monthStr) {
    const container = document.getElementById('summary-header-container');
    container.innerHTML = `
        <div class="flex items-center justify-between bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
            <div class="relative w-full">
                <div class="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center justify-between cursor-pointer">
                    <span id="display-summary-month">${formatDisplayMonth(monthStr)}</span>
                    <svg class="text-blue-500" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                <input type="month" id="input-summary-month" value="${monthStr}" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
            </div>
        </div>
        <div id="summary-global-kpi" class="grid grid-cols-2 gap-3 mb-6"></div>
    `;

    document.getElementById('input-summary-month').addEventListener('change', (e) => {
        document.getElementById('display-summary-month').innerText = formatDisplayMonth(e.target.value);
        generateSummary(e.target.value);
    });

    generateSummary(monthStr);
}

async function generateSummary(monthPrefix) {
    const listContainer = document.getElementById('summary-list');
    listContainer.className = "flex flex-col gap-3 px-4 pb-4"; 
    listContainer.innerHTML = '<div class="py-10 text-center text-sm text-gray-400 font-bold">Calculating ledger...</div>';

    try {
        const members = await getAllMembers();
        const records = await getMonthRecords(monthPrefix);

        if (!members || members.length === 0) {
            listContainer.innerHTML = '<div class="bg-white dark:bg-[#1a1a1c] p-8 rounded-2xl text-center shadow-sm border border-gray-200 dark:border-gray-800"><p class="text-sm text-gray-500 font-medium">No members found in Directory.</p></div>';
            document.getElementById('summary-global-kpi').innerHTML = '';
            return;
        }

        const summaryData = {};
        members.forEach(m => {
            if (m && m.id) {
                summaryData[m.id] = { 
                    member: m, day: 0, night: 0, rice: 0, noRice: 0, total: 0, logs: [] 
                };
            }
        });

        let globalTotal = 0;
        let globalRice = 0;

        if (records && records.length > 0) {
            records.forEach(r => {
                if (!r || !r.memberId || !r.date || !summaryData[r.memberId]) return;

                const s = summaryData[r.memberId];
                let dVal = r.day === 'OFF' ? 0 : 1;
                let nVal = r.night === 'OFF' ? 0 : 1;
                
                s.day += dVal;
                s.night += nVal;
                s.total += (dVal + nVal);
                globalTotal += (dVal + nVal);

                if (r.day === 'RICE') { s.rice++; globalRice++; }
                if (r.day === 'NORICE') s.noRice++;
                if (r.night === 'RICE') { s.rice++; globalRice++; }
                if (r.night === 'NORICE') s.noRice++;

                s.logs.push({
                    date: r.date,
                    dayStr: r.day === 'NORICE' ? 'No-Rice' : (r.day === 'OFF' ? '--' : 'Rice'),
                    nightStr: r.night === 'NORICE' ? 'No-Rice' : (r.night === 'OFF' ? '--' : 'Rice')
                });
            });
        }

        document.getElementById('summary-global-kpi').innerHTML = `
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center items-center shadow-sm">
                <div class="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Total Meals</div>
                <div class="text-3xl font-black text-gray-900 dark:text-white leading-none">${globalTotal}</div>
            </div>
            <div class="bg-gray-50 dark:bg-[#1a1a1c] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 flex flex-col justify-center items-center shadow-sm">
                <div class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Rice</div>
                <div class="text-3xl font-black text-gray-900 dark:text-white leading-none">${globalRice}</div>
            </div>
        `;

        listContainer.innerHTML = '';
        const activeMembers = Object.values(summaryData).filter(s => s.member.status === 'ACTIVE' || s.total > 0);
        activeMembers.sort((a, b) => a.member.name.localeCompare(b.member.name));

        activeMembers.forEach(s => {
            const card = document.createElement('div');
            card.className = "bg-white dark:bg-[#1a1a1c] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden";
            
            s.logs.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
            
            const logHtml = s.logs.length === 0 
                ? `<div class="text-xs text-gray-400 py-3 text-center font-medium">No meals logged this month.</div>` 
                : s.logs.map(l => {
                    const parts = l.date.split('-');
                    const formattedDate = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : l.date;
                    return `<div class="flex justify-between text-[11px] py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0 text-gray-600 dark:text-gray-400"><span class="font-bold text-gray-900 dark:text-gray-200">${formattedDate}</span><span>☀️ ${l.dayStr} <span class="opacity-30 px-1">|</span> 🌙 ${l.nightStr}</span></div>`;
                }).join('');

            card.innerHTML = `
                <div class="px-4 py-3.5 flex items-center justify-between cursor-pointer drawer-toggle active:bg-gray-50 dark:active:bg-[#111] transition-colors">
                    <div class="flex items-center gap-3 flex-1 pr-3 truncate">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-inner" style="background-color: ${getAvatarColor(s.member.name)};">
                            ${getInitials(s.member.name)}
                        </div>
                        <div class="flex-1 truncate">
                            <div class="font-bold text-sm text-gray-900 dark:text-white truncate">${s.member.name}</div>
                            <div class="text-[11px] font-medium text-gray-500 mt-0.5 tracking-wide">Rm ${s.member.room || 'N/A'}</div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end shrink-0">
                        <div class="text-sm font-black text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">${s.total} Meals</div>
                        <div class="text-[10px] font-bold text-gray-500 mt-1">🍚 ${s.rice} Rice</div>
                    </div>
                </div>

                <div class="drawer-content max-h-0 overflow-hidden transition-all duration-300 ease-in-out bg-gray-50 dark:bg-[#111]">
                    <div class="p-4 border-t border-gray-100 dark:border-gray-800">
                        <div class="flex justify-between items-center mb-4 bg-white dark:bg-[#1a1a1c] p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div class="text-center flex-1 border-r border-gray-100 dark:border-gray-800"><div class="text-[9px] text-gray-400 font-black uppercase tracking-widest">Day</div><div class="text-sm font-black text-gray-900 dark:text-white mt-0.5">${s.day}</div></div>
                            <div class="text-center flex-1 border-r border-gray-100 dark:border-gray-800"><div class="text-[9px] text-gray-400 font-black uppercase tracking-widest">Night</div><div class="text-sm font-black text-gray-900 dark:text-white mt-0.5">${s.night}</div></div>
                            <div class="text-center flex-1"><div class="text-[9px] text-gray-400 font-black uppercase tracking-widest">No-Rice</div><div class="text-sm font-black text-gray-900 dark:text-white mt-0.5">${s.noRice}</div></div>
                        </div>
                        
                        <div class="max-h-40 overflow-y-auto mb-4 bg-white dark:bg-[#1a1a1c] p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                            ${logHtml}
                        </div>

                        <!-- Universal Native Share Button -->
                        <button class="btn-share w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform" data-share='${JSON.stringify(s)}'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            Share Receipt
                        </button>
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });

        attachDrawerListeners(listContainer, monthPrefix);

    } catch (error) {
        console.error("Ledger Calculation Error:", error);
        listContainer.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl text-center shadow-sm border border-red-200 dark:border-red-900/30"><p class="text-sm text-red-600 dark:text-red-400 font-bold">Error loading records.</p><p class="text-xs text-red-500 mt-2">Corrupt data detected in database.</p></div>`;
    }
}

// ==========================================
// 4. ACCORDION & NATIVE SHARE LOGIC
// ==========================================
function attachDrawerListeners(container, monthPrefix) {
    const formatDisplayMonthName = formatDisplayMonth(monthPrefix);

    container.querySelectorAll('.drawer-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const content = btn.nextElementSibling;
            if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                content.style.maxHeight = '0px';
            } else {
                container.querySelectorAll('.drawer-content').forEach(c => c.style.maxHeight = '0px');
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    container.querySelectorAll('.btn-share').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const data = JSON.parse(btn.getAttribute('data-share'));
            
            let receiptText = `🧾 *MEALS CONSUMPTION DETAILS*\n`;
            receiptText += `🗓️ ${formatDisplayMonthName}\n`;
            receiptText += `👤 *${data.member.name}*\n`;
            receiptText += `📞 ${data.member.phone}\n`;
            receiptText += `──────────────────\n`;
            receiptText += `📊 *MONTHLY TOTALS*\n`;
            receiptText += `Total Meals : *${data.total}*\n`;
            receiptText += `Day         : ${data.day}\n`;
            receiptText += `Night       : ${data.night}\n`;
            receiptText += `Rice        : ${data.rice}\n`;
            receiptText += `Non-Rice    : ${data.noRice}\n`;
            receiptText += `──────────────────\n`;
            
            if (data.logs.length > 0) {
                receiptText += `📅 *DATE-WISE LOG*\n`;
                data.logs.forEach(l => {
                    const parts = l.date.split('-');
                    if (parts.length === 3) {
                        receiptText += `*${parts[2]}.${parts[1]}.${parts[0]}*\n`;
                        receiptText += `☀️ Day: ${l.dayStr} | 🌙 Ngt: ${l.nightStr}\n\n`;
                    }
                });
            } else {
                receiptText += `No meals logged.\n`;
            }

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Mess Receipt - ${data.member.name}`,
                        text: receiptText
                    });
                } catch (err) {
                    console.log("Share action cancelled by user.");
                }
            } else {
                navigator.clipboard.writeText(receiptText);
                alert("Receipt copied to clipboard.");
            }
        });
    });
}

// ==========================================
// 5. EXPORT UTILITIES (JSON BACKUP)
// ==========================================
async function backupData() {
    try {
        const data = await getExportData();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `MessManager_Backup_${new Date().toISOString().split('T')[0]}.json`);
        dlAnchorElem.click();
    } catch (e) {
        alert("Failed to create backup.");
    }
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.members || !data.records) throw new Error("Invalid format");
            await restoreExportData(data);
            alert("Backup restored successfully!");
            window.location.reload();
        } catch (error) {
            alert("Error restoring data. Ensure it is a valid Mess Manager backup file.");
        }
    };
    reader.readAsText(file);
}
