/**
 * A storage utility class to communicate with
 * local and session storage with option of AES encryption
 */
class BrowserStorage {
  storage: Storage | null = null;
  constructor(storage: Storage | null) {
    this.storage = storage;
  }

  getItem(key: string) {
    const value: string | null = JSON.parse(
      this.storage?.getItem(key) ?? 'null'
    ) as string | null;
    return value;
  }
  setItem(key: string, value: string) {
    return this.storage?.setItem(key, JSON.stringify(value));
  }
  removeItem(key: string) {
    return this.storage?.removeItem(key);
  }
  clear() {
    return this.storage?.clear();
  }
}

export const storage = {
  local: new BrowserStorage(window.localStorage),
  session: new BrowserStorage(window.sessionStorage),
};
