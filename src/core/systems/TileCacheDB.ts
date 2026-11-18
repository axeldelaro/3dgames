interface TileCacheRecord<T = unknown> {
  key: string;
  value: T;
  savedAt: number;
  expiresAt: number | null;
}

const DB_NAME = 'omniverse_tile_cache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'tiles';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_MEMORY_ENTRIES = 160;

export class TileCacheDB {
  private static dbPromise: Promise<IDBDatabase | null> | null = null;
  private static idbDisabled = false;
  private static readonly memoryCache = new Map<string, TileCacheRecord>();

  private static openDatabase(): Promise<IDBDatabase | null> {
    if (TileCacheDB.idbDisabled) {
      return Promise.resolve(null);
    }

    if (TileCacheDB.dbPromise) {
      return TileCacheDB.dbPromise;
    }

    if (typeof indexedDB === 'undefined' || indexedDB === null) {
      TileCacheDB.idbDisabled = true;
      return Promise.resolve(null);
    }

    TileCacheDB.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            TileCacheDB.dbPromise = null;
          };
          resolve(db);
        };

        request.onerror = () => {
          TileCacheDB.idbDisabled = true;
          TileCacheDB.dbPromise = null;
          resolve(null);
        };

        request.onblocked = () => {
          resolve(null);
        };
      } catch {
        TileCacheDB.idbDisabled = true;
        TileCacheDB.dbPromise = null;
        resolve(null);
      }
    });

    return TileCacheDB.dbPromise;
  }

  private static setMemoryEntry<T>(record: TileCacheRecord<T>): void {
    if (TileCacheDB.memoryCache.has(record.key)) {
      TileCacheDB.memoryCache.delete(record.key);
    } else if (TileCacheDB.memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = TileCacheDB.memoryCache.keys().next().value;
      if (typeof oldestKey === 'string') {
        TileCacheDB.memoryCache.delete(oldestKey);
      }
    }
    TileCacheDB.memoryCache.set(record.key, record);
  }

  public static async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const memHit = TileCacheDB.memoryCache.get(key) as TileCacheRecord<T> | undefined;

    if (memHit) {
      if (memHit.expiresAt !== null && now > memHit.expiresAt) {
        TileCacheDB.memoryCache.delete(key);
        void TileCacheDB.remove(key);
        return null;
      }
      // Refresh LRU position
      TileCacheDB.memoryCache.delete(key);
      TileCacheDB.memoryCache.set(key, memHit);
      return memHit.value;
    }

    const db = await TileCacheDB.openDatabase();
    if (!db) {
      return null;
    }

    return new Promise<T | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const record = req.result as TileCacheRecord<T> | undefined;
          if (!record) {
            resolve(null);
            return;
          }
          if (record.expiresAt !== null && now > record.expiresAt) {
            void TileCacheDB.remove(key);
            resolve(null);
            return;
          }
          TileCacheDB.setMemoryEntry(record);
          resolve(record.value);
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  public static async set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    const now = Date.now();
    const record: TileCacheRecord<T> = {
      key,
      value,
      savedAt: now,
      expiresAt: Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : null
    };

    TileCacheDB.setMemoryEntry(record);

    const db = await TileCacheDB.openDatabase();
    if (!db) {
      return;
    }

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(record);

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public static async remove(key: string): Promise<void> {
    TileCacheDB.memoryCache.delete(key);
    const db = await TileCacheDB.openDatabase();
    if (!db) {
      return;
    }

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public static async clear(): Promise<void> {
    TileCacheDB.memoryCache.clear();
    const db = await TileCacheDB.openDatabase();
    if (!db) {
      return;
    }

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}
