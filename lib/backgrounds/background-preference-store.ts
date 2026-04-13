import {
  createLocalStorageAdapter,
  createPersistentStore,
} from "@/lib/storage/persistent-store";

const BACKGROUND_STORAGE_KEY = "interactive-page.background";

export const backgroundPreferenceStore = createPersistentStore<string>({
  key: BACKGROUND_STORAGE_KEY,
  adapter: createLocalStorageAdapter(),
  parse: (rawValue) => rawValue,
  serialize: (value) => value,
});
