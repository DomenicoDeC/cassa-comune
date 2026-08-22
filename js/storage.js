/**
 * Cassa Comune Storage & JSON Import/Export Management
 */

import { state } from './state.js';

const STORAGE_KEY = 'cassa_comune_active_trip';

/**
 * Saves current trip to browser localStorage
 */
export function saveTripToStorage() {
    if (state.trip.id) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trip));
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * Loads trip from browser localStorage. Returns true if loaded successfully.
 */
export function loadTripFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (validateTripSchema(parsed)) {
                state.trip = parsed;
                return true;
            }
        }
    } catch (e) {
        console.error("Error loading trip from storage:", e);
    }
    return false;
}

/**
 * Deletes current trip from storage and state
 */
export function clearTripStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Exports current trip state as a downloadable JSON file
 */
export function exportTripAsJSON() {
    if (!state.trip.id) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.trip, null, 2));
    const downloadAnchor = document.createElement('a');
    
    const dateStr = new Date().toISOString().slice(0,10);
    const sanitizedTitle = state.trip.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cassa_comune_${sanitizedTitle}_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

/**
 * Imports a trip from a JSON string. Validates schema and saves to storage.
 */
export function importTripFromJSON(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        if (validateTripSchema(parsed)) {
            state.trip = parsed;
            saveTripToStorage();
            return true;
        } else {
            throw new Error("Il file caricato non corrisponde al formato richiesto.");
        }
    } catch (e) {
        console.error("Error importing trip from JSON:", e);
        throw e;
    }
}

/**
 * Validates that the loaded object follows the expected trip schema
 */
function validateTripSchema(obj) {
    if (!obj || typeof obj !== 'object') return false;
    
    const hasRequiredFields = 'id' in obj && 'name' in obj && 'currency' in obj && 'participants' in obj && 'transactions' in obj;
    if (!hasRequiredFields) return false;
    
    const validParticipants = Array.isArray(obj.participants) && obj.participants.every(p => p && typeof p === 'object' && 'id' in p && 'name' in p);
    if (!validParticipants) return false;
    
    const validTransactions = Array.isArray(obj.transactions) && obj.transactions.every(t => {
        if (!t || typeof t !== 'object') return false;
        const baseFields = 'id' in t && 'type' in t && 'description' in t && 'amount' in t && 'date' in t && 'payerId' in t;
        if (!baseFields) return false;
        
        // Type validation
        if (t.type !== 'expense' && t.type !== 'income') return false;
        
        // Expense must have splitIds
        if (t.type === 'expense' && !Array.isArray(t.splitIds)) return false;
        
        return true;
    });
    
    return validTransactions;
}
