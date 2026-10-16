import { z } from "zod";
import type { CategoryFilter, FilterValues, NumberRange } from "./filter-engine.ts";
import { filterParams, type FilterParam } from "./filter-params.ts";

/**
 * Filtros in the link as flat params: a list Filtro as its choice ids joined
 * by commas (`peso=ate50,50-60`), a range as `min-max` with an open side left
 * empty (`gramas=-60`). Whatever does not parse is dropped without an error.
 */

export type FilterSearch = Partial<Record<FilterParam, string>>;

/** The Filtro params of a parsed link, each still raw text for the Categoria to read. */
export function pickFilterSearch(search: Readonly<Record<string, unknown>>): FilterSearch {
  const picked: FilterSearch = {};
  for (const param of filterParams) {
    const text = search[param];
    if (typeof text === "string" && text.length <= 1000) picked[param] = text;
  }
  return picked;
}

const integerDigits = String.raw`\d{1,6}`;
const fractionDigits = String.raw`\d{1,3}`;
const decimal = String.raw`${integerDigits}(?:\.${fractionDigits})?`;

/**
 * A typed bound the link can hold: a decimal comma or point, the link's
 * precision, and a bare separator while the decimals are still being typed.
 */
export const typedBoundPattern = new RegExp(String.raw`^${integerDigits}(?:[.,]\d{0,3})?$`);
const rangeParamSchema = z
  .string()
  .regex(new RegExp(`^(?:${decimal})?-(?:${decimal})?$`))
  .transform((text): NumberRange => {
    const [min = "", max = ""] = text.split("-");
    return { min: min === "" ? undefined : Number(min), max: max === "" ? undefined : Number(max) };
  });

export function filterValuesFromSearch(
  filters: readonly CategoryFilter[],
  search: Readonly<FilterSearch>,
): FilterValues {
  const choices: Partial<Record<FilterParam, readonly string[]>> = {};
  const ranges: Partial<Record<FilterParam, NumberRange>> = {};
  for (const filter of filters) {
    const text = search[filter.param];
    if (text === undefined) continue;
    if (filter.kind === "range") {
      const range = rangeParamSchema.safeParse(text);
      if (range.success) ranges[filter.param] = range.data;
      continue;
    }
    const marked = new Set(text.split(","));
    const ids = filter.choices.flatMap((choice) => (marked.has(choice.id) ? [choice.id] : []));
    if (ids.length > 0) choices[filter.param] = ids;
  }
  return { choices, ranges };
}

function rangeParamOf(range: NumberRange | undefined): string | undefined {
  if (range === undefined || (range.min === undefined && range.max === undefined)) return undefined;
  return `${range.min ?? ""}-${range.max ?? ""}`;
}

function filterParamOf(filter: CategoryFilter, values: FilterValues): string | undefined {
  if (filter.kind === "range") return rangeParamOf(values.ranges[filter.param]);
  const marked = values.choices[filter.param] ?? [];
  const ids = filter.choices.flatMap((choice) => (marked.includes(choice.id) ? [choice.id] : []));
  return ids.length > 0 ? ids.join(",") : undefined;
}

/**
 * Every Filtro param, undefined for an inactive Filtro and for one another
 * Categoria owns, so both leave the link.
 */
export function filterSearchOf(
  filters: readonly CategoryFilter[],
  values: FilterValues,
): Partial<Record<FilterParam, string | undefined>> {
  const search: Partial<Record<FilterParam, string | undefined>> = {};
  for (const param of filterParams) search[param] = undefined;
  for (const filter of filters) search[filter.param] = filterParamOf(filter, values);
  return search;
}
