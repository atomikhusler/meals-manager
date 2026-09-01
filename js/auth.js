// js/auth.js

const SECRET_SALT = "MealsManager2026_SKR"; 

export function generateKey(name, phone) {
    // 1. Normalize the inputs to prevent typos from breaking the hash
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '');
    const cleanPhone = phone.trim();
    const rawData = cleanName + cleanPhone + SECRET_SALT;
    
    // 2. Bitwise Hashing Algorithm (Standard lightweight string to 32-bit integer)
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
        const char = rawData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    
    // 3. Convert to Alphanumeric Base-36 and format nicely
    let base36 = Math.abs(hash).toString(36).toUpperCase();
    
    // Ensure it's exactly 6 characters by padding if too short
    while (base36.length < 6) {
        base36 += "X";
    }
    
    // Format as XXX-XXX
    const finalKey = base36.substring(0, 3) + "-" + base36.substring(3, 6);
    return finalKey;
}

export function validateLicense(name, phone, inputKey) {
    const expectedKey = generateKey(name, phone);
    return inputKey.trim().toUpperCase() === expectedKey;
}
