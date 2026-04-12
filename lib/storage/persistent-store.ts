export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PersistentStore<T> {
  read(): T | null;
  write(value: T): void;
}

type StoreOptions<T> = {
  key: string;
  adapter: StorageAdapter;
  parse: (rawValue: string) => T | null;
  serialize: (value: T) => string;
};

export function createPersistentStore<T>({
  key,
  adapter,
  parse,
  serialize,
}: StoreOptions<T>): PersistentStore<T> {
  return {
    read() {
      const rawValue = adapter.getItem(key);
      if (rawValue === null) {
        return null;
      }

      return parse(rawValue);
    },
    write(value) {
      adapter.setItem(key, serialize(value));
    },
  };
}

export function createLocalStorageAdapter(): StorageAdapter {
  function getStorage() {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  }

  return {
    getItem(key) {
      const storage = getStorage();
      if (!storage) {
        return null;
      }

      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      const storage = getStorage();
      if (!storage) {
        return;
      }

      try {
        storage.setItem(key, value);
      } catch {
        // Ignore unavailable storage so the terminal still works without persistence.
      }
    },
  };
}
