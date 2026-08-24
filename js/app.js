/**
 * Cassa Comune Application Entry Point
 */

import { loadTripFromStorage } from './storage.js';
import { bindUIEvents, refreshAllViews } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Event Listeners
    bindUIEvents();
    
    // 2. Load active trip from Local Storage if present
    const hasActiveTrip = loadTripFromStorage();
    
    // 3. Render the correct screen
    refreshAllViews();
    
    // 4. Register Service Worker (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/cassa-comune/sw.js')
            .then(() => console.log('Service Worker registrato ✅'))
            .catch(e => console.warn('SW registration failed:', e));
    }

    console.log(`Cassa Comune initialized. Trip loaded: ${hasActiveTrip}`);
});
