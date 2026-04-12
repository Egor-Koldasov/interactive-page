import {
  createLocalStorageAdapter,
  createPersistentStore,
} from "@/lib/storage/persistent-store";

const TERMINAL_THEME_STORAGE_KEY = "interactive-page.terminal-theme";

export const terminalThemePreferenceStore = createPersistentStore<string>({
  key: TERMINAL_THEME_STORAGE_KEY,
  adapter: createLocalStorageAdapter(),
  parse: (rawValue) => rawValue,
  serialize: (value) => value,
});
