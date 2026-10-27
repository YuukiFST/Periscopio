import { useSyncExternalStore } from "react";

const themes = ["claro", "escuro", "sistema"] as const;
export type Theme = (typeof themes)[number];

const tableDensities = ["confortavel", "compacta"] as const;
export type TableDensity = (typeof tableDensities)[number];

/** The `index.html` script reads this key before the first paint. */
const themeKey = "periscopio:tema";
const tableDensityKey = "periscopio:densidade-da-tabela";
/**
 * The `index.html` script applies the theme again on this event; its detail is
 * the theme the storage could not keep, or null once the storage holds it.
 */
const themeChangeEvent = "periscopio:tema";

/**
 * A choice kept on this device, its default when nothing valid is stored, and
 * every mounted reader rereads after a change, here or in another tab.
 * A blocked or full storage only loses the choice for the next visit.
 */
function storedChoice<Value extends string>(
  key: string,
  values: readonly Value[],
  fallback: Value,
) {
  const listeners = new Set<() => void>();
  let unsaved: Value | undefined;
  function read(): Value {
    if (unsaved !== undefined) return unsaved;
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
  /** False when the storage could not keep the choice, which then lasts until a reload. */
  function write(value: Value): boolean {
    unsaved = value;
    try {
      if (value === fallback) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      unsaved = undefined;
    } catch {}
    for (const listener of listeners) listener();
    return unsaved === undefined;
  }
  return { read, subscribe, write };
}

const storedTheme = storedChoice(themeKey, themes, "sistema");
const storedTableDensity = storedChoice(tableDensityKey, tableDensities, "confortavel");

export function useTheme() {
  const theme = useSyncExternalStore(storedTheme.subscribe, storedTheme.read);
  function setTheme(next: Theme) {
    const saved = storedTheme.write(next);
    window.dispatchEvent(new CustomEvent(themeChangeEvent, { detail: saved ? null : next }));
  }
  return [theme, setTheme] as const;
}

export function useTableDensity() {
  const density = useSyncExternalStore(storedTableDensity.subscribe, storedTableDensity.read);
  return [density, storedTableDensity.write] as const;
}
