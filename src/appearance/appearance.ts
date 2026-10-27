import { useSyncExternalStore } from "react";

const themes = ["claro", "escuro", "sistema"] as const;
export type Theme = (typeof themes)[number];

const tableDensities = ["confortavel", "compacta"] as const;
export type TableDensity = (typeof tableDensities)[number];

/** The `index.html` script reads this key before the first paint. */
const themeKey = "periscopio:tema";
const tableDensityKey = "periscopio:densidade-da-tabela";
/** The `index.html` script applies the stored theme again on this event. */
const themeChangeEvent = "periscopio:tema";

/**
 * A choice kept on this device, its default when nothing valid is stored or
 * the browser blocks site storage, and every mounted reader rereads after a
 * change, here or in another tab.
 */
function storedChoice<Value extends string>(
  key: string,
  values: readonly Value[],
  fallback: Value,
) {
  const listeners = new Set<() => void>();
  function read(): Value {
    try {
      const stored = localStorage.getItem(key);
      return values.find((value) => value === stored) ?? fallback;
    } catch {
      return fallback;
    }
  }
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }
  /** False when the browser blocks site storage, so the choice did not stick. */
  function write(value: Value): boolean {
    try {
      if (value === fallback) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      return false;
    }
    for (const listener of listeners) listener();
    return true;
  }
  return { read, subscribe, write };
}

const storedTheme = storedChoice(themeKey, themes, "sistema");
const storedTableDensity = storedChoice(tableDensityKey, tableDensities, "confortavel");

export function useTheme() {
  const theme = useSyncExternalStore(storedTheme.subscribe, storedTheme.read);
  function setTheme(next: Theme) {
    if (storedTheme.write(next)) window.dispatchEvent(new Event(themeChangeEvent));
  }
  return [theme, setTheme] as const;
}

export function useTableDensity() {
  const density = useSyncExternalStore(storedTableDensity.subscribe, storedTableDensity.read);
  return [density, storedTableDensity.write] as const;
}
