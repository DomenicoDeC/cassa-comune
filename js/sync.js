/**
 * Cassa Comune - Firebase Realtime Sync Module
 * Sincronizzazione in tempo reale tra tutti i partecipanti
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getDatabase, ref, set, onValue, get } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCWpokbotFLAomlCDnPcIRZ59ZoFWhjzJU",
  authDomain: "cassa-comune-f24e6.firebaseapp.com",
  databaseURL: "https://cassa-comune-f24e6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cassa-comune-f24e6",
  storageBucket: "cassa-comune-f24e6.firebasestorage.app",
  messagingSenderId: "248792259520",
  appId: "1:248792259520:web:f006b41ed2404feaf20625"
};

const APP_URL = 'https://domenicodec.github.io/cassa-comune/';

let _app = null;
let _db = null;
let _unsubscribe = null;

function getDb() {
    if (!_db) {
        _app = initializeApp(firebaseConfig);
        _db = getDatabase(_app);
    }
    return _db;
}

/**
 * Salva il viaggio su Firebase (aggiunge _updatedAt per gestire la freshness)
 */
export async function saveTripToFirebase(trip) {
    const db = getDb();
    const payload = { ...trip, _updatedAt: Date.now() };
    await set(ref(db, `trips/${trip.id}`), payload);
}

/**
 * Carica il viaggio da Firebase dato il tripId
 */
export async function loadTripFromFirebase(tripId) {
    const db = getDb();
    const snapshot = await get(ref(db, `trips/${tripId}`));
    if (!snapshot.exists()) throw new Error('Viaggio non trovato nel cloud. Assicurati che il link sia corretto.');
    const data = snapshot.val();
    delete data._updatedAt; // rimuovi campo interno prima di restituire
    return data;
}

/**
 * Ascolta aggiornamenti in tempo reale su un viaggio.
 * Il callback riceve i nuovi dati ogni volta che cambiano.
 * Restituisce la funzione per de-registrare il listener.
 */
export function listenToTrip(tripId, callback) {
    // Cancella listener precedente se esiste
    if (_unsubscribe) {
        _unsubscribe();
        _unsubscribe = null;
    }

    const db = getDb();
    const tripRef = ref(db, `trips/${tripId}`);
    let firstCall = true;

    const unsub = onValue(tripRef, (snapshot) => {
        if (firstCall) {
            // Prima chiamata = stato iniziale, già caricato → ignora
            firstCall = false;
            return;
        }
        if (snapshot.exists()) {
            const data = snapshot.val();
            delete data._updatedAt;
            callback(data);
        }
    });

    _unsubscribe = unsub;
    return unsub;
}

/**
 * Ferma il listener in tempo reale
 */
export function stopListening() {
    if (_unsubscribe) {
        _unsubscribe();
        _unsubscribe = null;
    }
}

/**
 * Genera il link di invito pubblico per un viaggio
 */
export function getInviteLink(tripId) {
    return `${APP_URL}?trip=${tripId}`;
}

/**
 * Genera URL QR Code
 */
export function generateQRCodeUrl(link) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}&bgcolor=1a2030&color=ffffff&margin=10`;
}

/**
 * Legge il tripId dal parametro ?trip= nell'URL
 */
export function getTripIdFromUrl() {
    return new URLSearchParams(window.location.search).get('trip');
}
