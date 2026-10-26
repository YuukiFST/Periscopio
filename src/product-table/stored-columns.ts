import { useSyncExternalStore } from "react";
import type { CategorySlug } from "../categories.ts";

function storedColumnsKey(category: CategorySlug): string {
  return `periscopio:colunas:${category}`;
}

/** Null as well when the browser blocks site storage, so the table still opens without it. */
function readStoredColumns(category: CategorySlug): string | null {
  try {
    return localStorage.getItem(storedColumnsKey(category));
  } catch {
    return null;
  }
}

const storedColumnsListeners = new Set<() => void>();

function subscribeToStoredColumns(listener: () => void): () => void {
  storedColumnsListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    storedColumnsListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * The `col` text last chosen on this device for the Categoria, the table's
 * columns when the link has none, and how to replace it; undefined forgets it.
 */
export function useStoredColumns(category: CategorySlug) {
  const stored = useSyncExternalStore(subscribeToStoredColumns, () => readStoredColumns(category));
  function store(columnsParam: string | undefined) {
    // The link holds the choice too, so a blocked storage only loses it for the next visit.
    try {
      if (columnsParam === undefined) localStorage.removeItem(storedColumnsKey(category));
      else localStorage.setItem(storedColumnsKey(category), columnsParam);
    } catch {
      return;
    }
    for (const listener of storedColumnsListeners) listener();
  }
  return [stored ?? undefined, store] as const;
}
