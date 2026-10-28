import type { SortEntry } from "./table-columns.ts";

/** `ordem=nenhuma` keeps the Fonte's own order; no `ordem` means the default sort. */
export const unsortedParam = "nenhuma";

/** Shape of `ordem`: column slugs or field keys, comma-separated, `-` for descending. */
export const sortParamPattern = /^-?[a-zA-Z][a-zA-Z0-9-]*(?:,-?[a-zA-Z][a-zA-Z0-9-]*)*$/;

function parseSortEntry(part: string): SortEntry {
  return part.startsWith("-") ? { slug: part.slice(1), desc: true } : { slug: part, desc: false };
}

function sortParamOf(sorting: SortEntry[]): string {
  if (sorting.length === 0) return unsortedParam;
  return sorting.map(({ slug, desc }) => (desc ? `-${slug}` : slug)).join(",");
}

/**
 * The sorting a link asks for. Slugs that are not sortable columns of this
 * Categoria are dropped; a link left with none falls back to the default.
 */
export function sortingFromParam(
  sortParam: string | undefined,
  sortableSlugs: ReadonlySet<string>,
  defaultSort: SortEntry[],
): SortEntry[] {
  if (sortParam === undefined) return defaultSort;
  if (sortParam === unsortedParam) return [];
  const seen = new Set<string>();
  const sorting = sortParam
    .split(",")
    .map(parseSortEntry)
    .filter(({ slug }) => {
      if (!sortableSlugs.has(slug) || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
  return sorting.length > 0 ? sorting : defaultSort;
}

/**
 * `ordem` after a click on a column header: ascending, then descending, then
 * no order; a click on another column starts it ascending. Returns undefined
 * when the result is the default sort, so the link stays short.
 */
export function sortParamAfterHeaderClick(
  sorting: SortEntry[],
  clickedSlug: string,
  defaultSort: SortEntry[],
): string | undefined {
  const primary = sorting[0];
  let next: SortEntry[];
  if (primary?.slug !== clickedSlug) next = [{ slug: clickedSlug, desc: false }];
  else if (!primary.desc) next = [{ slug: clickedSlug, desc: true }];
  else next = [];
  const nextParam = sortParamOf(next);
  return nextParam === sortParamOf(defaultSort) ? undefined : nextParam;
}
