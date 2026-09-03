// js/file-export.js
import { initDB } from './database.js';

// --- HELPER FUNCTION: GATHERS ALL DATABASE DATA ---
async function buildMatrixData(monthPrefix) {
    const db = await initDB();
    
    // 1. Fetch all members
    const members = await new Promise(r => db.transaction(['Directory'], 'readonly').objectStore('Directory').getAll().onsuccess = e => r(e.target.result));
    
    // 2. Fetch meals for the selected month
    const meals = await new Promise(r => {
        const idx = db.transaction(['Meals'], 'readonly').objectStore('Meals').index('date');
        idx.getAll(IDBKeyRange.bound(`${monthPrefix}-01`, `${monthPrefix}-31`)).onsuccess = e => r(e.target.result);
    });

    const [year, month] = monthPrefix.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let matrixPairs = [];
    let slNo = 1;
    // Format abbreviations for the table
    const formatMeal = (val) => val === 'RICE' ? 'R' : val === 'NORICE' ? 'NR' : '-';

    // 3. Process each member's meals into a Day and Night row
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

        const GrandTotalMeals = personDayTotal + personNightTotal; 
        const TotalRice = personTotalRice; 

        if (personDayTotal > 0 || personNightTotal > 0 || member.status === 'ACTIVE') {
            matrixPairs.push({ dayRow, nightRow, GrandTotalMeals, TotalRice });
        }
    });
    return { year, month, daysInMonth, matrixPairs }; // Returning year and month for formatting
}

// --- CSV/EXCEL EXPORT ---
export async function downloadExcel() {
    const monthPrefix = document.getElementById('input-summary-month').value;
    if (!monthPrefix) return alert("Select a month first.");
    
    const { year, month, daysInMonth, matrixPairs } = await buildMatrixData(monthPrefix);
    
    // Generate dynamic Premium Title for CSV
    const dateObj = new Date(year, month - 1);
    const monthName = dateObj.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const fullYearStr = dateObj.getFullYear();
    const fileName = `Monthly Meals Table (${monthName}, ${fullYearStr}) By Meals Manager App.csv`;

    let csv = `Sl.No.,NAME,Meal Time,`;
    for(let i=1; i<=daysInMonth; i++) csv += `${i},`;
    csv += `Total Meal,Total Rice\n`;

    matrixPairs.forEach(pair => {
        csv += `"${pair.dayRow.SlNo}","${pair.dayRow.Name}","${pair.dayRow.Time}",`; 
        csv += pair.dayRow.days.join(',') + `,`;
        csv += `"${pair.GrandTotalMeals}","${pair.TotalRice}"\n`; 
        
        csv += `,"","${pair.nightRow.Time}",`; 
        csv += pair.nightRow.days.join(',') + `,"",""\n`;
    });

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = fileName; // Uses premium name
    link.click();
}

// --- PREMIUM PDF EXPORT (NATIVE PRINT LAYOUT) ---
export async function printPDF() {
    const monthPrefix = document.getElementById('input-summary-month').value;
    if (!monthPrefix) return alert("Select a month first.");
    const { year, month, daysInMonth, matrixPairs } = await buildMatrixData(monthPrefix);

    // 1. Generate formatted strings (e.g., "SEPTEMBER, 2026")
    const dateObj = new Date(year, month - 1);
    const monthName = dateObj.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const fullYearStr = dateObj.getFullYear();
    const formattedDateTitle = `${monthName}, ${fullYearStr}`;
    
    // The exact PDF file name you requested
    const pdfFileName = `Monthly Meals Table (${formattedDateTitle}) By Meals Manager App`;

    // 2. Build the HTML layout with Pure Black CSS and Custom Branding
    let printHtml = `
        <div id="print-area" style="font-family: Arial, sans-serif; font-size: 10px;">
            <style>
                /* Forces Landscape and removes browser headers/footers */
                @page { size: landscape; margin: 10mm; }
                
                /* PURE BLACK TEXT FOR SHARPNESS */
                body { margin: 0; color: #000000; } 
                table { width: 100%; border-collapse: collapse; text-align: center; }
                
                /* PURE BLACK BORDERS */
                th, td { border: 1px solid #000000; padding: 4px; }
                th { background-color: #e5e7eb; font-weight: bold; border: 1.5px solid #000000; }
                
                .name-col { text-align: left; white-space: nowrap; font-weight: bold; font-size: 11px; }
                .border-t-heavy { border-top: 2px solid #000000; } /* Sharp heavy black line separating users */
                .tot-col { font-size: 13px; font-weight: bold; background-color: #f9fafb; }
            </style>

            <!-- BRANDING HEADER -->
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 24px; font-weight: 900; letter-spacing: 1px;">Meals Manager</div>
                <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">by Sahil Kumar Rout</div>
                
                <div style="font-size: 15px; font-weight: bold; margin-top: 15px; text-decoration: underline;">DATE WISE MEALS TABLE</div>
                <div style="font-size: 12px; font-weight: bold; margin-top: 4px;">FOR THE MONTH : ${formattedDateTitle}</div>
            </div>

            <!-- TABLE DATA -->
            <table>
                <thead>
                    <tr>
                        <th>Sl.No.</th>
                        <th class="name-col">NAME</th>
                        <th>Time</th>
    `;
    
    // Add day number headers
    for(let i=1; i<=daysInMonth; i++) printHtml += `<th>${i}</th>`;
    printHtml += `<th>Total Meal</th><th>Total Rice</th></tr></thead><tbody>`;

    // Populate rows
    matrixPairs.forEach(pair => {
        // DAY ROW
        printHtml += `<tr class="border-t-heavy">`; 
        printHtml += `<td rowspan="2">${pair.dayRow.SlNo}</td>`; 
        printHtml += `<td rowspan="2" class="name-col">${pair.dayRow.Name}</td>`;
        printHtml += `<td><strong>${pair.dayRow.Time}</strong></td>`;
        
        pair.dayRow.days.forEach(d => {
            // Colors remain for R/NR, but empty slots (-) are forced to pure black for sharpness
            let color = d === 'R' ? 'color: #2563eb;' : d === 'NR' ? 'color: #ea580c;' : 'color: #000000;';
            printHtml += `<td style="${color} font-weight: bold;">${d}</td>`;
        });
        
        printHtml += `<td rowspan="2" class="tot-col">${pair.GrandTotalMeals}</td>`;
        printHtml += `<td rowspan="2" class="tot-col" style="color: #2563eb;">${pair.TotalRice}</td>`;
        printHtml += `</tr>`;

        // NIGHT ROW
        printHtml += `<tr>`; 
        printHtml += `<td><strong>${pair.nightRow.Time}</strong></td>`;
        pair.nightRow.days.forEach(d => {
            let color = d === 'R' ? 'color: #2563eb;' : d === 'NR' ? 'color: #ea580c;' : 'color: #000000;';
            printHtml += `<td style="${color} font-weight: bold;">${d}</td>`;
        });
        printHtml += `</tr>`;
    });

    printHtml += `</tbody></table></div>`;

    // 3. Save current screen state
    const originalContent = document.body.innerHTML;
    const originalTitle = document.title;

    // 4. Inject PDF layout and change document title (this forces the PDF filename)
    document.title = pdfFileName;
    document.body.innerHTML = printHtml;
    
    // 5. Trigger print and restore app state
    setTimeout(() => {
        window.print();
        document.title = originalTitle; // Restore app name
        document.body.innerHTML = originalContent; // Restore UI
        window.location.reload(); // Hard reset to re-initialize JS listeners
    }, 200);
}
