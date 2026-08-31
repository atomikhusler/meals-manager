// js/export.js
import { initDB, factoryResetDB } from './database.js';

// ==========================================
// 1. WHATSAPP SHARE LOGIC (Globally Bound)
// ==========================================
window.sendWA = function(phone, name, month, rice, noRice, day, night, total) {
    if (!phone || phone === 'undefined' || phone === '') {
        return alert(`No mobile number saved for ${name}. Update their profile in Directory.`);
    }
    
    const text = `📋 *Mess Summary - ${month}*
👤 *${name}*
────────────────
🍚 Rice Meals: ${rice}
🍞 Non-Rice Meals: ${noRice}
☀️ Day Meals: ${day}
🌙 Night Meals: ${night}
────────────────
🍽️ *Total Meals: ${total}*`;

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, '_blank');
};

// ==========================================
// 2. UI SUMMARY ENGINE (Table & Lazy Accordion)
// ==========================================
export async function generateSummary() {
    const monthPrefix = document.getElementById('input-month').value;
    if (!monthPrefix) return;

    const db = await initDB();
    const tbody = document.getElementById('summary-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 font-bold text-gray-400">Crunching data...</td></tr>';

    const members = await new Promise(r => db.transaction(['Directory'], 'readonly').objectStore('Directory').getAll().onsuccess = e => r(e.target.result));
    const meals = await new Promise(r => {
        const idx = db.transaction(['Meals'], 'readonly').objectStore('Meals').index('date');
        idx.getAll(IDBKeyRange.bound(`${monthPrefix}-01`, `${monthPrefix}-31`)).onsuccess = e => r(e.target.result);
    });

    if (members.length === 0) return tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6">No members found.</td></tr>';

    const stats = {};
    members.forEach(m => stats[m.id] = { name: m.name, phone: m.phone, day: 0, night: 0, rice: 0, noRice: 0, total: 0 });

    meals.forEach(r => {
        if (!stats[r.memberId]) return;
        if (r.day !== 'OFF') { stats[r.memberId].day++; stats[r.memberId].total++; r.day === 'RICE' ? stats[r.memberId].rice++ : stats[r.memberId].noRice++; }
        if (r.night !== 'OFF') { stats[r.memberId].night++; stats[r.memberId].total++; r.night === 'RICE' ? stats[r.memberId].rice++ : stats[r.memberId].noRice++; }
    });

    tbody.innerHTML = '';
    
    Object.entries(stats).forEach(([memberId, s]) => {
        if (s.total === 0) return; 
        
        const tr = document.createElement('tr');
        tr.className = "cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors accordion-trigger";
        tr.setAttribute('data-member', memberId);
        tr.innerHTML = `
            <td class="px-5 py-4 font-bold text-gray-900 dark:text-white flex items-center gap-2"><span class="text-xs text-gray-400 expand-icon transition-transform">▶</span> ${s.name}</td>
            <td class="px-3 py-4 text-center font-medium">${s.day}</td>
            <td class="px-3 py-4 text-center font-medium">${s.night}</td>
            <td class="px-3 py-4 text-center font-black text-blue-600 dark:text-blue-400 text-lg">${s.total}</td>
            <td class="px-3 py-4 text-center text-gray-500">${s.rice}</td>
            <td class="px-3 py-4 text-center text-gray-500">${s.noRice}</td>
            <td class="px-3 py-4 text-right print:hidden"><button class="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" onclick="event.stopPropagation(); window.sendWA('${s.phone}', '${s.name}', '${monthPrefix}', ${s.rice}, ${s.noRice}, ${s.day}, ${s.night}, ${s.total})">Share</button></td>
        `;
        tbody.appendChild(tr);

        const accRow = document.createElement('tr');
        accRow.innerHTML = `<td colspan="7" class="p-0 border-0"><div id="acc-${memberId}" class="accordion-wrapper"><div class="accordion-content bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800"><div class="accordion-inner text-sm" id="acc-data-${memberId}"><div class="text-center py-4 text-gray-400">Loading history...</div></div></div></div></td>`;
        tbody.appendChild(accRow);
    });

    if (!tbody.hasAttribute('data-listener')) {
        tbody.addEventListener('click', handleAccordionClick);
        tbody.setAttribute('data-listener', 'true');
    }
}

async function handleAccordionClick(e) {
    const trigger = e.target.closest('.accordion-trigger');
    if (!trigger) return;
    const memberId = trigger.getAttribute('data-member');
    const wrapper = document.getElementById(`acc-${memberId}`);
    const dataContainer = document.getElementById(`acc-data-${memberId}`);
    const icon = trigger.querySelector('.expand-icon');

    const isExpanded = wrapper.classList.contains('expanded');
    document.querySelectorAll('.accordion-wrapper.expanded').forEach(w => w.classList.remove('expanded'));
    document.querySelectorAll('.expand-icon').forEach(i => i.style.transform = 'rotate(0deg)');

    if (!isExpanded) {
        wrapper.classList.add('expanded');
        icon.style.transform = 'rotate(90deg)';
        if (dataContainer.innerHTML.includes('Loading history')) {
            const monthPrefix = document.getElementById('input-month').value;
            const db = await initDB();
            const meals = await new Promise(r => {
                const idx = db.transaction(['Meals'], 'readonly').objectStore('Meals').index('date');
                idx.getAll(IDBKeyRange.bound(`${monthPrefix}-01`, `${monthPrefix}-31`)).onsuccess = e => r(e.target.result);
            });

            const myMeals = meals.filter(m => m.memberId == memberId && (m.day !== 'OFF' || m.night !== 'OFF')).sort((a, b) => a.date.localeCompare(b.date));
            let html = `<div class="grid grid-cols-2 md:grid-cols-3 gap-3 px-4 py-3">`;
            myMeals.forEach(m => {
                const d = new Date(m.date);
                html += `<div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs shadow-sm"><div class="font-black text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-1 mb-2">${d.toLocaleDateString('en-US', { weekday:'short', month: 'short', day: 'numeric' })}</div><div class="flex justify-between"><span class="text-gray-500">Day:</span> <span class="font-bold ${m.day === 'OFF' ? 'text-gray-300' : 'text-blue-600'}">${m.day === 'NORICE' ? 'NO-RICE' : m.day}</span></div><div class="flex justify-between mt-1"><span class="text-gray-500">Night:</span> <span class="font-bold ${m.night === 'OFF' ? 'text-gray-300' : 'text-indigo-600'}">${m.night === 'NORICE' ? 'NO-RICE' : m.night}</span></div></div>`;
            });
            html += `</div>`;
            dataContainer.innerHTML = html || '<div class="text-center py-4 text-gray-500">No meals found.</div>';
        }
    }
}

// ==========================================
// 3. EXPORT ENGINE (Professional Matrix)
// ==========================================
async function buildMatrixData(monthPrefix) {
    const db = await initDB();
    const members = await new Promise(r => db.transaction(['Directory'], 'readonly').objectStore('Directory').getAll().onsuccess = e => r(e.target.result));
    const meals = await new Promise(r => {
        const idx = db.transaction(['Meals'], 'readonly').objectStore('Meals').index('date');
        idx.getAll(IDBKeyRange.bound(`${monthPrefix}-01`, `${monthPrefix}-31`)).onsuccess = e => r(e.target.result);
    });

    const [year, month] = monthPrefix.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let matrixPairs = [];
    let slNo = 1;
    const formatMeal = (val) => val === 'RICE' ? 'R' : val === 'NORICE' ? 'NR' : '-';

    members.forEach(member => {
        const memberMeals = meals.filter(m => m.memberId === member.id);
        if (memberMeals.length === 0 && member.status !== 'ACTIVE') return; 

        let personDayTotal = 0, personNightTotal = 0, personTotalRice = 0;

        const dayRow = { SlNo: slNo++, Name: member.name, Time: 'D', days: Array(daysInMonth).fill('-') };
        const nightRow = { SlNo: '', Name: '', Time: 'N', days: Array(daysInMonth).fill('-') };

        memberMeals.forEach(record => {
            const dayIndex = parseInt(record.date.split('-')[2]) - 1;
            dayRow.days[dayIndex] = formatMeal(record.day);
            nightRow.days[dayIndex] = formatMeal(record.night);

            if (record.day !== 'OFF') { personDayTotal++; if(record.day === 'RICE') personTotalRice++; }
            if (record.night !== 'OFF') { personNightTotal++; if(record.night === 'RICE') personTotalRice++; }
        });

        // Combined Grand Totals
        const GrandTotalMeals = personDayTotal + personNightTotal;
        const TotalRice = personTotalRice;

        if (personDayTotal > 0 || personNightTotal > 0 || member.status === 'ACTIVE') {
            matrixPairs.push({ dayRow, nightRow, GrandTotalMeals, TotalRice });
        }
    });
    return { daysInMonth, matrixPairs };
}

// --- PROFESSIONAL CSV EXPORT ---
async function downloadExcel() {
    const monthPrefix = document.getElementById('input-month').value;
    if (!monthPrefix) return alert("Select a month first.");
    const { daysInMonth, matrixPairs } = await buildMatrixData(monthPrefix);
    
    let csv = `Sl.No.,NAME,Meal Time,`;
    for(let i=1; i<=daysInMonth; i++) csv += `${i},`;
    csv += `Total Meal,Total Rice\n`;

    matrixPairs.forEach(pair => {
        // Day Row (Contains Totals)
        csv += `"${pair.dayRow.SlNo}","${pair.dayRow.Name}","${pair.dayRow.Time}",`;
        csv += pair.dayRow.days.join(',') + `,`;
        csv += `"${pair.GrandTotalMeals}","${pair.TotalRice}"\n`;
        
        // Night Row (Empty Totals)
        csv += `,"","${pair.nightRow.Time}",`;
        csv += pair.nightRow.days.join(',') + `,"",""\n`;
    });

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = `Mess_Report_${monthPrefix}.csv`;
    link.click();
}

// --- PROFESSIONAL PDF EXPORT (Rowspan Matrix) ---
async function printPDF() {
    const monthPrefix = document.getElementById('input-month').value;
    if (!monthPrefix) return alert("Select a month first.");
    const { daysInMonth, matrixPairs } = await buildMatrixData(monthPrefix);

    let printHtml = `
        <div id="print-area" style="font-family: Arial, sans-serif; font-size: 10px;">
            <style>
                @page { size: landscape; margin: 10mm; }
                body { margin: 0; color: #111; }
                table { width: 100%; border-collapse: collapse; text-align: center; }
                th, td { border: 1px solid #999; padding: 4px; }
                th { background-color: #e5e7eb; font-weight: bold; border: 1px solid #666; }
                .name-col { text-align: left; white-space: nowrap; font-weight: bold; font-size: 11px; }
                .border-t-heavy { border-top: 2px solid #000; }
                .tot-col { font-size: 13px; font-weight: bold; background-color: #f9fafb; }
            </style>
            <h2 style="text-align: center; margin-bottom: 15px; font-size: 18px;">Mess Meal Report - ${monthPrefix}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Sl.No.</th>
                        <th class="name-col">NAME</th>
                        <th>Time</th>
    `;
    
    for(let i=1; i<=daysInMonth; i++) printHtml += `<th>${i}</th>`;
    printHtml += `<th>Total Meal</th><th>Total Rice</th></tr></thead><tbody>`;

    matrixPairs.forEach(pair => {
        // Build Day Row (with Rowspans bridging into the Night row)
        printHtml += `<tr class="border-t-heavy">`;
        printHtml += `<td rowspan="2">${pair.dayRow.SlNo}</td>`;
        printHtml += `<td rowspan="2" class="name-col">${pair.dayRow.Name}</td>`;
        printHtml += `<td><strong>${pair.dayRow.Time}</strong></td>`;
        
        pair.dayRow.days.forEach(d => {
            let color = d === 'R' ? 'color: #2563eb;' : d === 'NR' ? 'color: #ea580c;' : 'color: #ccc;';
            printHtml += `<td style="${color} font-weight: bold;">${d}</td>`;
        });
        
        printHtml += `<td rowspan="2" class="tot-col">${pair.GrandTotalMeals}</td>`;
        printHtml += `<td rowspan="2" class="tot-col" style="color: #2563eb;">${pair.TotalRice}</td>`;
        printHtml += `</tr>`;

        // Build Night Row (only Days need to be drawn, as SlNo, Name, and Totals are row-spanned)
        printHtml += `<tr>`;
        printHtml += `<td><strong>${pair.nightRow.Time}</strong></td>`;
        pair.nightRow.days.forEach(d => {
            let color = d === 'R' ? 'color: #2563eb;' : d === 'NR' ? 'color: #ea580c;' : 'color: #ccc;';
            printHtml += `<td style="${color} font-weight: bold;">${d}</td>`;
        });
        printHtml += `</tr>`;
    });

    printHtml += `</tbody></table></div>`;

    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printHtml;
    
    setTimeout(() => {
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); 
    }, 200);
}

// ==========================================
// 4. ADMIN TOOLS & FACTORY RESET
// ==========================================
export function initToolsAndSummary() {
    document.getElementById('btn-generate').addEventListener('click', generateSummary);
    document.getElementById('btn-export-csv').addEventListener('click', downloadExcel);
    document.getElementById('btn-print').addEventListener('click', printPDF);

    // ADMIN TRANSFER EXPORT
    document.getElementById('btn-backup-json').addEventListener('click', async () => {
        const db = await initDB();
        const exportData = { app: "MessManager_AdminTransfer", timestamp: new Date().toISOString() };
        exportData.directory = await new Promise(r => db.transaction(['Directory']).objectStore('Directory').getAll().onsuccess = e => r(e.target.result));
        exportData.meals = await new Promise(r => db.transaction(['Meals']).objectStore('Meals').getAll().onsuccess = e => r(e.target.result));
        
        const link = document.createElement('a');
        link.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
        link.download = `MessManager_Admin_Transfer_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    });

    // ADMIN TRANSFER IMPORT
    document.getElementById('file-restore').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm("⚠️ Overwrite current device data with this Admin Transfer file?")) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.app !== "MessManager_AdminTransfer" && data.app !== "MessManager_v2") throw new Error("Invalid Transfer File");

                const db = await initDB();
                const tx = db.transaction(['Directory', 'Meals'], 'readwrite');
                tx.objectStore('Directory').clear();
                tx.objectStore('Meals').clear();
                data.directory.forEach(item => tx.objectStore('Directory').add(item));
                data.meals.forEach(item => tx.objectStore('Meals').add(item));
                
                tx.oncomplete = () => { alert("Transfer Complete!"); window.location.reload(); };
            } catch (err) { alert("Error reading file: " + err.message); }
        };
        reader.readAsText(file);
    });

    // FACTORY RESET
    document.getElementById('btn-factory-reset').addEventListener('click', async () => {
        const code = prompt('DANGER: This permanently deletes ALL members and meals from this device.\n\nType "RESET" to confirm:');
        if (code === 'RESET') {
            await factoryResetDB();
            alert("App Factory Reset Complete. All data wiped.");
            window.location.reload();
        } else if (code !== null) {
            alert("Factory Reset Cancelled: Incorrect confirmation text.");
        }
    });
}