import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import { categorySlugs, type CategorySlug } from "../categories.ts";

/** Enough to find a Produto again without turning the list into a second table. */
export const recentProductsPerCategory = 10;

const recentProductsKey = "periscopio:vistos-recentemente";

const recentProductSchema = z.strictObject({
  id: z.guid(),
  category: z.enum(categorySlugs),
  viewedAt: z.iso.datetime(),
});
export type RecentProduct = z.infer<typeof recentProductSchema>;

/** Each entry on its own, so one broken entry never hides the rest. */
function parseRecentProducts(stored: string | null): RecentProduct[] {
  if (stored === null) return [];
  let json: unknown;
  try {
    json = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(json)) return [];
  return json.flatMap((entry): RecentProduct[] => {
    const parsed = recentProductSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Null as well when the browser blocks site storage, so the header still shows without it. */
function readRecentProducts(): string | null {
  try {
    return localStorage.getItem(recentProductsKey);
  } catch {
    return null;
  }
}

/** Every mounted list rereads after a change, here or in another tab. */
const recentProductsListeners = new Set<() => void>();

function subscribeToRecentProducts(listener: () => void): () => void {
  recentProductsListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    recentProductsListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** A blocked or full storage only loses the history; the panel opens all the same. */
function writeRecentProducts(recent: readonly RecentProduct[]): void {
  try {
    if (recent.length === 0) localStorage.removeItem(recentProductsKey);
    else localStorage.setItem(recentProductsKey, JSON.stringify(recent));
  } catch {
    return;
  }
  for (const listener of recentProductsListeners) listener();
}

/** Puts the Produto first, once, and drops the oldest past the Categoria's limit. */
export function recordRecentProduct(category: CategorySlug, id: string): void {
  const others = parseRecentProducts(readRecentProducts()).filter(
    (entry) => entry.id !== id || entry.category !== category,
  );
  const recent = [{ id, category, viewedAt: new Date().toISOString() }, ...others];
  const shownPerCategory = new Map<CategorySlug, number>();
  writeRecentProducts(
    recent.filter((entry) => {
      const shown = (shownPerCategory.get(entry.category) ?? 0) + 1;
      shownPerCategory.set(entry.category, shown);
      return shown <= recentProductsPerCategory;
    }),
  );
}

export function clearRecentProducts(): void {
  writeRecentProducts([]);
}

/** The Produtos last opened in the panel, across Categorias, newest first. */
export function useRecentProducts(): RecentProduct[] {
  const stored = useSyncExternalStore(subscribeToRecentProducts, readRecentProducts);
  return useMemo(() => parseRecentProducts(stored), [stored]);
}
