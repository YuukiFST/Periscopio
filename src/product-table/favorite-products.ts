import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import type { CategorySlug } from "../categories.ts";

function favoritesKey(category: CategorySlug): string {
  return `periscopio:favoritos:${category}`;
}

const storedFavoritesSchema = z.array(z.unknown()).catch([]);
const favoriteIdSchema = z.guid();

/** The stored ids, in order; text that is not a list or an id is dropped. */
function parseFavoriteIds(text: string | null): string[] {
  if (text === null) return [];
  let stored: unknown;
  try {
    stored = JSON.parse(text);
  } catch {
    return [];
  }
  const ids = storedFavoritesSchema
    .parse(stored)
    .filter((id): id is string => favoriteIdSchema.safeParse(id).success);
  return [...new Set(ids)];
}

/** Null as well when the browser blocks site storage, so the table still opens without it. */
function readStoredFavorites(category: CategorySlug): string | null {
  try {
    return localStorage.getItem(favoritesKey(category));
  } catch {
    return null;
  }
}

const favoritesListeners = new Set<() => void>();

function subscribeToFavorites(listener: () => void): () => void {
  favoritesListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    favoritesListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * The Categoria's Favoritos on this device and how to star or unstar one.
 * An id the current data lacks stays stored, so the Produto is a Favorito
 * again if a later Atualização brings it back.
 */
export function useFavoriteIds(category: CategorySlug) {
  const stored = useSyncExternalStore(subscribeToFavorites, () => readStoredFavorites(category));
  const favoriteIds: ReadonlySet<string> = useMemo(
    () => new Set(parseFavoriteIds(stored)),
    [stored],
  );
  function toggleFavorite(id: string) {
    const ids = parseFavoriteIds(readStoredFavorites(category));
    const nextIds = ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id];
    // Without storage the star cannot hold; the toggle stays as it was.
    try {
      localStorage.setItem(favoritesKey(category), JSON.stringify(nextIds));
    } catch {
      return;
    }
    for (const listener of favoritesListeners) listener();
  }
  return [favoriteIds, toggleFavorite] as const;
}
