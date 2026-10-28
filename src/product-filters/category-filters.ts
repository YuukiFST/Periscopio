import type { CategorySlug } from "../categories.ts";
import type { CategoryData } from "../data/schema.ts";
import { commonFilters } from "./common-filters.ts";
import { resolveFilters, type CategoryFilter, type FilterDefinition } from "./filter-engine.ts";
import { keyboardFilters } from "./keyboard-filters.ts";
import { monitorFilters } from "./monitor-filters.ts";
import { mouseFilters } from "./mouse-filters.ts";

/** Every Categoria's Filtros, the Fonte's common ones first (research file, 2026-10-16). */
const filterDefinitions: Record<CategorySlug, readonly FilterDefinition[]> = {
  mouse: [...commonFilters("mouse"), ...mouseFilters],
  teclado: [...commonFilters("teclado"), ...keyboardFilters],
  monitor: [...commonFilters("monitor"), ...monitorFilters],
};

export function categoryFiltersFor(data: CategoryData): CategoryFilter[] {
  return resolveFilters(filterDefinitions[data.category], data);
}
