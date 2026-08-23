/**
 * High-capacity IndexedDB storage driver for TypeNova custom wallpapers & visual preferences.
 * Overcomes localStorage's 5MB quota to support 4K/8K images without quota crashes.
 */

const DB_NAME = 'typenova_custom_wallpapers_db';
const STORE_NAME = 'wallpapers_store';
const DB_VERSION = 1;

export interface WallpaperConfig {
  id: string;
  dataUrl: string;
  brightness: number; // 0.2 to 1.0
  blur: number; // 0 to 20 px
  customAccent?: string; // Optional user color override
  extractedThemeJson?: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWallpaperToDB(config: WallpaperConfig): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(config);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed, falling back to localStorage if small enough:', err);
    try {
      if (config.dataUrl.length < 3 * 1024 * 1024) {
        localStorage.setItem('typezen_wallpaper_url', config.dataUrl);
      }
    } catch {
      // Ignore fallback failure
    }
  }
}

export async function loadWallpaperFromDB(id: string = 'active'): Promise<WallpaperConfig | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed, trying localStorage fallback:', err);
    try {
      const fallbackUrl = localStorage.getItem('typezen_wallpaper_url');
      if (fallbackUrl) {
        return {
          id: 'active',
          dataUrl: fallbackUrl,
          brightness: 0.7,
          blur: 0,
          timestamp: Date.now(),
        };
      }
    } catch {}
    return null;
  }
}

export async function clearWallpaperFromDB(id: string = 'active'): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear error:', err);
  } finally {
    try {
      localStorage.removeItem('typezen_wallpaper_url');
      localStorage.removeItem('typezen_wallpaper_theme');
    } catch {}
  }
}
