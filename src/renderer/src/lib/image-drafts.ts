import type { DraftImage } from "@shared/types";

export interface ImageDraftStorage {
  read(key: string): Promise<readonly DraftImage[]>;
  write(key: string, images: readonly DraftImage[]): Promise<void>;
}

export function unsentImages(images: readonly DraftImage[], submitted: readonly DraftImage[]) {
  const sent = new Set(submitted.map((image) => image.id));
  return images.filter((image) => !sent.has(image.id));
}

export function createImageDraftStore(storage: ImageDraftStorage) {
  const memory = new Map<string, readonly DraftImage[]>();
  const writes = new Map<string, Promise<boolean>>();
  const read = async (key: string) => {
    if (memory.has(key)) return memory.get(key)!;
    let images: readonly DraftImage[] = [];
    try {
      images = await storage.read(key);
    } catch {
      /* Keep in-memory drafts when storage is unavailable. */
    }
    if (!memory.has(key)) memory.set(key, images);
    return memory.get(key)!;
  };
  const write = (key: string, images: readonly DraftImage[]) => {
    memory.set(key, images);
    const pending = (writes.get(key) ?? Promise.resolve(true)).then(async () => {
      try {
        await storage.write(key, images);
        return true;
      } catch {
        return false;
      }
    });
    writes.set(key, pending);
    void pending.then(() => {
      if (writes.get(key) === pending) writes.delete(key);
    });
    return pending;
  };
  return { read, write };
}

let database: Promise<IDBDatabase> | undefined;
const openDatabase = () =>
  (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("t3-companion-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Image draft storage is busy."));
  }));

export const imageDrafts = createImageDraftStore({
  async read(key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction("images").objectStore("images").get(key);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  },
  async write(key, images) {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("images", "readwrite");
      const store = transaction.objectStore("images");
      if (images.length) store.put(images, key);
      else store.delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  },
});
