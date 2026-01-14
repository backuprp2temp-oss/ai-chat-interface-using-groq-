const DB_NAME = 'VoiceStudioDB';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveTrack = async (track) => {
    try {
        // Prepare the track data before opening the transaction
        let trackToSave = { ...track };

        if (!track.blob && track.url && track.url.startsWith('blob:')) {
            try {
                const response = await fetch(track.url);
                const blob = await response.blob();
                trackToSave.blob = blob;
                delete trackToSave.url; // Don't save the ephemeral blob URL
            } catch (error) {
                console.error('Failed to fetch blob from URL:', error);
                throw error;
            }
        }

        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(trackToSave);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error saving track:', error);
        throw error;
    }
};

export const getAllTracks = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const tracks = request.result.map(track => {
                    // Recreate Blob URL from stored blob
                    if (track.blob) {
                        return {
                            ...track,
                            url: URL.createObjectURL(track.blob)
                        };
                    }
                    return track;
                });
                // Sort by timestamp descending (newest first)
                tracks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(tracks);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting tracks:', error);
        throw error;
    }
};

export const deleteTrack = async (id) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error deleting track:', error);
        throw error;
    }
};
