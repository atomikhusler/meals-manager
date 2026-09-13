// js/auth.js

// ==========================================
// 💡 Paste your Supabase Project URL and Public Anon Key here
const SUPABASE_URL = "YOUR_URL";
const SUPABASE_ANON_KEY = "YOUR_KEY";
// ==========================================
        
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// 1. MANAGER HARDWARE AUTHENTICATION (God Mode Security)
// ============================================================================

// Permanent, cryptographically secure Device Identifier
export function getOrCreateDeviceId() {
    let did = localStorage.getItem('mm_device_id');
    if (!did) {
        did = crypto.randomUUID();
        localStorage.setItem('mm_device_id', did);
    }
    return did;
}

// Submit activation request to Supabase
export async function requestActivation(name, phone) {
    const deviceId = getOrCreateDeviceId();

    // Check if device already registered
    const { data: existing, error: fetchErr } = await supabase
        .from('activations')
        .select('status')
        .eq('device_id', deviceId)
        .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);

    if (existing) {
        return { success: true, status: existing.status, deviceId };
    }

    // Insert new request
    const { error: insertErr } = await supabase
        .from('activations')
        .insert([{
            device_id: deviceId,
            name: name.trim(),
            phone: phone.trim(),
            status: 'PENDING'
        }]);

    if (insertErr) throw new Error(insertErr.message);
    return { success: true, status: 'PENDING', deviceId };
}

// Background status check for boot validation and kill-switch
export async function verifyLicenseStatus() {
    const deviceId = getOrCreateDeviceId();
    try {
        const { data, error } = await supabase
            .from('activations')
            .select('status')
            .eq('device_id', deviceId)
            .maybeSingle();

        if (error || !data) return 'UNREGISTERED';
        return data.status; // 'PENDING' | 'APPROVED' | 'REVOKED'
    } catch {
        // Network unavailable: fall back to cached local state if available
        return localStorage.getItem('mm_license_valid') === 'true' ? 'OFFLINE_APPROVED' : 'OFFLINE_BLOCKED';
    }
}

// Realtime WebSocket channel listening for approval
export function listenForActivationApproval(onApproved) {
    const deviceId = getOrCreateDeviceId();

    return supabase
        .channel(`device-sync-${deviceId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'activations',
                filter: `device_id=eq.${deviceId}`
            },
            (payload) => {
                if (payload.new && payload.new.status === 'APPROVED') {
                    localStorage.setItem('mm_license_valid', 'true');
                    onApproved();
                }
            }
        )
        .subscribe();
}

// ============================================================================
// 2. STUDENT FRICTIONLESS AUTHENTICATION (Phone + PIN)
// ============================================================================

export async function studentLogin(messCode, phone, pin) {
    try {
        // 1. Verify the Mess Code exists
        const { data: mess, error: messErr } = await supabase
            .from('messes')
            .select('id')
            .eq('mess_code', messCode.toUpperCase())
            .maybeSingle();

        if (messErr || !mess) throw new Error("Invalid Mess Code.");

        // 2. Authenticate the Student within that specific Mess
        const { data: student, error: studentErr } = await supabase
            .from('profiles')
            .select('user_id, name, role, status')
            .eq('mess_id', mess.id)
            .eq('phone', phone.trim())
            .eq('pin_hash', pin.trim())
            .eq('role', 'STUDENT')
            .maybeSingle();

        if (studentErr || !student) throw new Error("Invalid Mobile Number or PIN.");
        if (student.status === 'INACTIVE') throw new Error("Your account has been deactivated by the Manager.");

        // 3. Save session locally so they don't have to log in again
        const sessionData = {
            user_id: student.user_id,
            mess_id: mess.id,
            name: student.name,
            role: 'STUDENT',
            timestamp: new Date().getTime()
        };
        
        localStorage.setItem('mm_student_session', JSON.stringify(sessionData));
        return { success: true };

    } catch (error) {
        throw error;
    }
}

export function getStudentSession() {
    const sessionStr = localStorage.getItem('mm_student_session');
    if (!sessionStr) return null;
    return JSON.parse(sessionStr);
}

export function logoutStudent() {
    localStorage.removeItem('mm_student_session');
}
