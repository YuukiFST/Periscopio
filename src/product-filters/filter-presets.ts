import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import type { CategorySlug } from "../categories.ts";
import type { CategoryFilter, FilterValues } from "./filter-engine.ts";
import {
  filterSearchOf,
  filterValuesFromSearch,
  pickFilterSearch,
  type FilterSearch,
} from "./filter-link.ts";
import { filterParams } from "./filter-params.ts";

/** A named set of Filtro params, as the link writes them (`peso=-60`). */
export type FilterPreset = { name: string; search: FilterSearch };

/**
 * One-click Filtros per Categoria. Most wireless mouses are EyeJoker's "유무선"
 * (cable and receiver), so "Sem fio leve" marks it next to "무선".
 */
export const filterPresets: Record<CategorySlug, readonly FilterPreset[]> = {
  mouse: [{ name: "Sem fio leve", search: { conexao: "sem-fio,com-e-sem-fio", peso: "-60" } }],
  teclado: [{ name: "Magnético", search: { switch: "magnetico" } }],
  monitor: [
    { name: "240 Hz ou mais", search: { taxa: "240-" } },
    { name: "OLED", search: { painel: "oled" } },
  ],
};

/** The link params of these values, without the inactive Filtros. */
export function activeSearchOf(
  filters: readonly CategoryFilter[],
  values: FilterValues,
): FilterSearch {
  const linkSearch = filterSearchOf(filters, values);
  const search: FilterSearch = {};
  for (const param of filterParams) {
    const text = linkSearch[param];
    if (text !== undefined) search[param] = text;
  }
  return search;
}

function sameSearch(a: FilterSearch, b: FilterSearch): boolean {
  return filterParams.every((param) => a[param] === b[param]);
}

/** False when the Categoria's data lacks one of the preset's Filtros or choices. */
export function isPresetAvailable(
  filters: readonly CategoryFilter[],
  search: FilterSearch,
): boolean {
  return isSearchApplied(filters, filterValuesFromSearch(filters, search), search);
}

/** True when the link holds exactly these Filtros, no more and no fewer. */
export function isSearchApplied(
  filters: readonly CategoryFilter[],
  values: FilterValues,
  search: FilterSearch,
): boolean {
  return sameSearch(activeSearchOf(filters, values), search);
}

/** Filtros the user named and kept on this device, per Categoria. */
const savedFiltersSchema = z.array(
  z.object({
    name: z.string().min(1),
    search: z.record(z.string(), z.unknown()).transform(pickFilterSearch),
  }),
);

function savedFiltersKey(category: CategorySlug): string {
  return `periscopio:filtros-salvos:${category}`;
}

function parseSavedFilters(stored: string | null): FilterPreset[] {
  if (stored === null) return [];
  let json: unknown;
  try {
    json = JSON.parse(stored);
  } catch {
    return [];
  }
  const parsed = savedFiltersSchema.safeParse(json);
  return parsed.success ? parsed.data : [];
}

/** Every mounted list (side panel and drawer) rereads after a change, here or in another tab. */
const savedFiltersListeners = new Set<() => void>();

function subscribeToSavedFilters(listener: () => void): () => void {
  savedFiltersListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    savedFiltersListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function writeSavedFilters(category: CategorySlug, saved: readonly FilterPreset[]): void {
  localStorage.setItem(savedFiltersKey(category), JSON.stringify(saved));
  for (const listener of savedFiltersListeners) listener();
}

/** The Categoria's saved Filtros, and how to add (replacing one with the same name) or delete one. */
export function useSavedFilters(category: CategorySlug) {
  const stored = useSyncExternalStore(subscribeToSavedFilters, () =>
    localStorage.getItem(savedFiltersKey(category)),
  );
  const saved = useMemo(() => parseSavedFilters(stored), [stored]);
  return {
    saved,
    save: (preset: FilterPreset) =>
      writeSavedFilters(category, [...saved.filter((kept) => kept.name !== preset.name), preset]),
    remove: (name: string) =>
      writeSavedFilters(
        category,
        saved.filter((kept) => kept.name !== name),
      ),
  };
}
