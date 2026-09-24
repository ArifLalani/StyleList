/**
 * Local photo store.
 *
 * Clothing photos are far too large for localStorage, so they live in
 * IndexedDB as blobs and the rest of the closet only keeps the key. When a
 * real backend is connected this module is the single place that changes:
 * keep the same four functions and point them at object storage.
 */

const DB_NAME = "stylelist-photos";
const DB_VERSION = 1;
const STORE = "photos";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Photo storage is not available in this browser."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export async function putPhoto(key: string, blob: Blob): Promise<string> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return key;
}

export async function getPhoto(key: string): Promise<Blob | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePhoto(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearPhotos(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ------------------------------------------------------------------ */
/* Object URL cache - keeps <img src> stable across re-renders          */
/* ------------------------------------------------------------------ */

const urlCache = new Map<string, string>();

export async function photoUrl(key?: string): Promise<string | undefined> {
  if (!key) return undefined;
  const cached = urlCache.get(key);
  if (cached) return cached;
  try {
    const blob = await getPhoto(key);
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    urlCache.set(key, url);
    return url;
  } catch {
    return undefined;
  }
}

export function forgetPhotoUrl(key: string): void {
  const url = urlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(key);
  }
}
