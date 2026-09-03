// js/auth.js

// 💡 Paste your Supabase Project URL and Public Anon Key here
const SUPABASE_URL = "https://usazhtrcafnsylffrhhv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYXpodHJjYWZuc3lsZmZyaGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzUyMTYsImV4cCI6MjEwMzk1MTIxNn0.KPAfz21-QfmaK5VOSqVXpkUBT7LujNQjsW85HTsqRhI";
        
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    // Insert new request (RLS ensures status can only be 'PENDING')
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
