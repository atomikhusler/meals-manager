// js/database.js
import { supabase } from './auth.js';

// ==========================================
// 1. INITIALIZATION
// ==========================================
export async function initDB() {
    // We bypass IndexedDB creation entirely.
    // Resolving here allows the app.js boot sequence to continue smoothly.
    return Promise.resolve();
}

function getMessId() {
    const messId = localStorage.getItem('mm_manager_mess_id');
    if (!messId) throw new Error("No active mess found for this manager.");
    return messId;
}

// ==========================================
// 2. DIRECTORY API (Cloud Connected)
// ==========================================
export async function addMember(name, room, phone) {
    const { error } = await supabase.from('profiles').insert([{
        mess_id: getMessId(),
        role: 'STUDENT',
        name: name.trim(),
        room: room.trim() || null,
        phone: phone.trim(),
        status: 'ACTIVE',
        pin_hash: '1234' // Default onboarding PIN. We can add UI to customize this later.
    }]);
    
    if (error) throw new Error(error.message);
}

export async function getAllMembers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('mess_id', getMessId())
        .eq('role', 'STUDENT')
        .order('name', { ascending: true });
        
    if (error || !data) return [];
    
    // Map cloud data to match your exact old IndexedDB JSON structure
    return data.map(m => ({
        id: m.id, 
        name: m.name, 
        room: m.room, 
        phone: m.phone, 
        status: m.status
    }));
}

export async function getActiveMembers() {
    const all = await getAllMembers();
    return all.filter(m => m.status === 'ACTIVE');
}

export async function updateMemberStatus(memberId, newStatus) {
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', memberId);
        
    if (error) throw new Error(error.message);
}

export async function deleteMember(memberId) {
    // Cascading hard delete: Clears their meals from the cloud first, then the profile
    await supabase.from('meal_logs').delete().eq('member_id', memberId);
    await supabase.from('profiles').delete().eq('id', memberId);
}

// ==========================================
// 3. MEALS API (Cloud Connected)
// ==========================================
export async function getDayRecords(dateString) {
    const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('mess_id', getMessId())
        .eq('log_date', dateString);
        
    if (error || !data) return [];
    
    return data.map(r => ({
        id: r.id,
        date: r.log_date,
        memberId: r.member_id,
        day: r.day_meal,
        night: r.night_meal
    }));
}

export async function saveMealRecord(date, memberId, timeOfDay, mealValue) {
    // Construct the unique ID exactly as the old local database did
    const recordId = `${date}_${memberId}`; 
    
    // Fetch existing record for today
    const { data: existing } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('id', recordId)
        .maybeSingle();
        
    let payload = existing ? { ...existing } : { 
        id: recordId, 
        mess_id: getMessId(), 
        member_id: memberId, 
        log_date: date, 
        day_meal: 'OFF', 
        night_meal: 'OFF' 
    };
    
    if (timeOfDay === 'day') payload.day_meal = mealValue;
    if (timeOfDay === 'night') payload.night_meal = mealValue;
    
    const { error } = await supabase.from('meal_logs').upsert([payload]);
    if (error) throw new Error(error.message);
}

// ==========================================
// 4. ADMIN EXPORT TOOLS (Legacy Support)
// ==========================================
export async function getMonthRecords(monthPrefix) {
    const { data } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('mess_id', getMessId())
        .like('log_date', `${monthPrefix}%`);
        
    if (!data) return [];
    return data.map(r => ({
        id: r.id,
        date: r.log_date,
        memberId: r.member_id,
        day: r.day_meal,
        night: r.night_meal
    }));
}

// These are temporarily stubbed to prevent UI crashes if you click old export buttons.
export async function getExportData() { return { members: [], records: [] }; }
export async function restoreExportData(data) { return Promise.resolve(); }
export async function clearDatabase() { return Promise.resolve(); }
export async function factoryResetDB() { return Promise.resolve(); }
