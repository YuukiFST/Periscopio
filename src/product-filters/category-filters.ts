import type { CategorySlug } from "../categories.ts";
import type { CategoryData } from "../data/schema.ts";
import { commonFilters } from "./common-filters.ts";
import { resolveFilters, type CategoryFilter, type FilterDefinition } from "./filter-engine.ts";
import { earphoneFilters } from "./earphone-filters.ts";
import { keyboardFilters } from "./keyboard-filters.ts";
import { monitorFilters } from "./monitor-filters.ts";
import { mouseFilters } from "./mouse-filters.ts";
import { mousepadFilters } from "./mousepad-filters.ts";
import { switchFilters } from "./switch-filters.ts";

/**
 * Every Categoria's Filtros, the Fonte's common ones first (research file, 2026-10-16).
 * The Fonte has no Filtros of its own for mousepads, switches and fones; theirs are the app's.
 */
const filterDefinitions: Record<CategorySlug, readonly FilterDefinition[]> = {
  mouse: [...commonFilters("mouse"), ...mouseFilters],
  teclado: [...commonFilters("teclado"), ...keyboardFilters],
  monitor: [...commonFilters("monitor"), ...monitorFilters],
  mousepad: [...commonFilters("mousepad"), ...mousepadFilters],
  switch: [...commonFilters("switch"), ...switchFilters],
  fone: [...commonFilters("fone"), ...earphoneFilters],
};

export function categoryFiltersFor(data: CategoryData): CategoryFilter[] {
  return resolveFilters(filterDefinitions[data.category], data);
}
