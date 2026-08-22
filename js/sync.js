/**
 * Cassa Comune - Cloud Sync Module
 * Usa JSONBlob (https://jsonblob.com) per salvare e caricare i dati del viaggio.
 * I dati sono pubblici ma accessibili solo chi conosce il blobId.
 */

const JSONBLOB_API = 'https://jsonblob.com/api/jsonBlob';
const APP_URL = 'https://domenicodec.github.io/cassa-comune/';
const STORAGE_KEY_BLOB = 'cassacomune_blob_id';

/**
 * Carica i dati del viaggio su JSONBlob e restituisce il blobId.
 * Se esiste già un blobId salvato, aggiorna il blob esistente.
 */
export async function uploadTripToCloud(tripData) {
    const existingBlobId = localStorage.getItem(STORAGE_KEY_BLOB);
    
    const payload = JSON.stringify(tripData);
    
    if (existingBlobId) {
        // PUT: aggiorna blob esistente
        const response = await fetch(`${JSONBLOB_API}/${existingBlobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: payload
        });
        if (!response.ok) throw new Error(`Errore aggiornamento cloud: ${response.status}`);
        return existingBlobId;
    } else {
        // POST: crea nuovo blob
        const response = await fetch(JSONBLOB_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: payload
        });
        if (!response.ok) throw new Error(`Errore creazione cloud: ${response.status}`);
        // Il blobId è nell'header Location: .../api/jsonBlob/{id}
        const location = response.headers.get('Location') || '';
        const blobId = location.split('/').pop();
        if (!blobId) throw new Error('blobId non ricevuto da JSONBlob');
        localStorage.setItem(STORAGE_KEY_BLOB, blobId);
        return blobId;
    }
}

/**
 * Scarica i dati del viaggio da JSONBlob dato il blobId.
 */
export async function downloadTripFromCloud(blobId) {
    const response = await fetch(`${JSONBLOB_API}/${blobId}`, {
        headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Errore download cloud: ${response.status}`);
    return await response.json();
}

/**
 * Genera il link di invito pubblico dato il blobId.
 */
export function generateInviteLink(blobId) {
    return `${APP_URL}?join=${blobId}`;
}

/**
 * Genera l'URL del QR Code per il link di invito.
 */
export function generateQRCodeUrl(link) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}&bgcolor=1a2030&color=ffffff&margin=10`;
}

/**
 * Legge il parametro ?join= dall'URL corrente.
 * Restituisce il blobId o null.
 */
export function getJoinIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('join') || null;
}

/**
 * Salva il blobId nel localStorage (per viaggi ospitati).
 */
export function saveBlobId(blobId) {
    localStorage.setItem(STORAGE_KEY_BLOB, blobId);
}

/**
 * Recupera il blobId salvato.
 */
export function getSavedBlobId() {
    return localStorage.getItem(STORAGE_KEY_BLOB);
}
