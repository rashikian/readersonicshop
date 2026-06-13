class SafeStorage {
  private memoryStore: Record<string, string> = {};
  private storageType: 'localStorage' | 'sessionStorage';

  constructor(type: 'localStorage' | 'sessionStorage') {
    this.storageType = type;
  }

  private isSupported(): boolean {
    try {
      const storage = typeof window !== 'undefined' ? window[this.storageType] : null;
      if (!storage) return false;
      const key = '__test_storage__';
      storage.setItem(key, 'test');
      storage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isSupported()) {
      try {
        return window[this.storageType].getItem(key);
      } catch (e) {
        // ignore
      }
    }
    return this.memoryStore[key] !== undefined ? this.memoryStore[key] : null;
  }

  setItem(key: string, value: string): void {
    if (this.isSupported()) {
      try {
        window[this.storageType].setItem(key, value);
        return;
      } catch (e) {
        // ignore
      }
    }
    this.memoryStore[key] = String(value);
  }

  removeItem(key: string): void {
    if (this.isSupported()) {
      try {
        window[this.storageType].removeItem(key);
        return;
      } catch (e) {
        // ignore
      }
    }
    delete this.memoryStore[key];
  }

  clear(): void {
    if (this.isSupported()) {
      try {
        window[this.storageType].clear();
        return;
      } catch (e) {
        // ignore
      }
    }
    this.memoryStore = {};
  }
}

export const safeLocalStorage = new SafeStorage('localStorage');
export const safeSessionStorage = new SafeStorage('sessionStorage');
