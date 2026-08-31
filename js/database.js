// js/database.js

const DB_NAME = 'MessManagerDB';
const DB_VERSION = 1;
let db;

// ==========================================
// 1. INITIALIZATION
// ==========================================
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Directory Table
            if (!database.objectStoreNames.contains('Directory')) {
                database.createObjectStore('Directory', { keyPath: 'id', autoIncrement: true });
            }
            
            // Meals Table
            if (!database.objectStoreNames.contains('Meals')) {
                const mealsStore = database.createObjectStore('Meals', { keyPath: 'id' });
                mealsStore.createIndex('date', 'date', { unique: false });
                mealsStore.createIndex('memberId', 'memberId', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => reject(event.target.error);
    });
}

// ==========================================
// 2. DIRECTORY API
// ==========================================
export function addMember(name, room, phone) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['Directory'], 'readwrite');
        tx.objectStore('Directory').add({ name, room, phone, status: 'ACTIVE' });
        
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

export function getAllMembers() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['Directory'], 'readonly');
        const req = tx.objectStore('Directory').getAll();
        
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

export function getActiveMembers() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['Directory'], 'readonly');
        const req = tx.objectStore('Directory').getAll();
        
        req.onsuccess = () => {
            const active = req.result.filter(m => m.status === 'ACTIVE');
            resolve(active);
        };
        req.onerror = (e) => reject(e.target.error);
    });
}

export function updateMemberStatus(memberId, newStatus) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['Directory'], 'readwrite');
        const store = tx.objectStore('Directory');
        
        const getRequest = store.get(memberId);
        getRequest.onsuccess = () => {
            const member = getRequest.result;
            if (member) {
                member.status = newStatus;
                store.put(member);
            }
        };
        
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

export function deleteMember(memberId) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['Directory'], 'readwrite');
        tx.objectStore('Directory').delete(memberId);
        
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

// ==========================================
// 3. MEALS API
// ==========================================
export function getDayRecords(dateString) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['Meals'], 'readonly');
        const index = tx.objectStore('Meals').index('date');
        const req = index.getAll(IDBKeyRange.only(dateString));
        
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

export function saveMealRecord(date, memberId, timeOfDay, mealValue) {
    return new Promise((resolve, reject) => {
        const recordId = `${date}_${memberId}`;
        const tx = db.transaction(['Meals'], 'readwrite');
        const store = tx.objectStore('Meals');
        const getReq = store.get(recordId);

        getReq.onsuccess = () => {
            let record = getReq.result;
            if (!record) {
                record = { id: recordId, date: date, memberId: parseInt(memberId), day: 'OFF', night: 'OFF' };
            }
            
            if (timeOfDay === 'day') record.day = mealValue;
            if (timeOfDay === 'night') record.night = mealValue;
            
            store.put(record);
        };

        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

// ==========================================
// 4. ADMIN SYSTEM CONTROLS
// ==========================================
export function factoryResetDB() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['Directory', 'Meals'], 'readwrite');
        tx.objectStore('Directory').clear();
        tx.objectStore('Meals').clear();
        
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}