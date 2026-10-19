import type { CategoryData, Field, Product } from "../data/schema.ts";
import { valueLabel } from "../i18n/labels.ts";
import type { FilterParam } from "./filter-params.ts";

/**
 * Filtros are data: each Categoria declares a list of definitions, and one
 * pure engine applies them. Within a Filtro the marked choices add up (OU);
 * across Filtros they narrow (E); a Produto without the value a Filtro reads
 * never passes it while it is active, as on EyeJoker.
 */

/** One choice of a list Filtro; `id` is its name in the link (`peso=ate50`). */
export type FilterChoice = {
  id: string;
  label: string;
  matches: (product: Product) => boolean;
};

type DefinitionBase = {
  param: FilterParam;
  label: string;
  /** Listed under "Filtros avançados", like EyeJoker's `isAdvanced`. */
  advanced?: boolean;
};

/** Named groups with their own rule, EyeJoker's cuts (weight bands, sensor class). */
export type BucketsDefinition = DefinitionBase & {
  kind: "buckets";
  buckets: readonly FilterChoice[];
};

/** The values of an ENUM field that some Produto has, each one a choice. */
export type OptionsDefinition = DefinitionBase & { kind: "options"; fieldKey: string };

/** Minimum and maximum of a number field, both optional. */
export type RangeDefinition = DefinitionBase & { kind: "range"; fieldKey: string; unit: string };

export type FilterDefinition = BucketsDefinition | OptionsDefinition | RangeDefinition;

/** A Filtro ready for one Categoria's data: options turned into choices. */
export type ChoiceFilter = DefinitionBase & {
  kind: "buckets" | "options";
  choices: readonly FilterChoice[];
};
export type RangeFilter = DefinitionBase & { kind: "range"; fieldKey: string; unit: string };
export type CategoryFilter = ChoiceFilter | RangeFilter;

export type NumberRange = { min: number | undefined; max: number | undefined };

/** What the user marked, by Filtro param; a missing or empty entry is an inactive Filtro. */
export type FilterValues = {
  choices: Readonly<Partial<Record<FilterParam, readonly string[]>>>;
  ranges: Readonly<Partial<Record<FilterParam, NumberRange>>>;
};

export const noFilterValues: FilterValues = { choices: {}, ranges: {} };

export function numberValue(product: Product, fieldKey: string): number | undefined {
  const value = product.values[fieldKey];
  return typeof value === "number" ? value : undefined;
}

/** An ENUM value as a list, single or multiple; empty when the Produto has none. */
export function enumValues(product: Product, fieldKey: string): readonly string[] {
  const value = product.values[fieldKey];
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value : [];
}

export function booleanValue(product: Product, fieldKey: string): boolean | undefined {
  const value = product.values[fieldKey];
  return typeof value === "boolean" ? value : undefined;
}

/** "PAW3360" before "PAW3950", and case or accents never split the order. */
const choiceLabelOrder = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

/** The field's values some Produto has, by label: EyeJoker's own option order is not sorted. */
function optionChoices(field: Field, products: readonly Product[]): FilterChoice[] {
  if (field.type !== "enum") return [];
  const used = new Set(products.flatMap((product) => enumValues(product, field.key)));
  return field.options
    .filter((option) => used.has(option.value))
    .map((option): FilterChoice => ({
      id: option.value,
      label: valueLabel(field, option.value),
      matches: (product) => enumValues(product, field.key).includes(option.value),
    }))
    .toSorted((a, b) => choiceLabelOrder.compare(a.label, b.label));
}

/**
 * The Categoria's Filtros for this version of the data. An `options` or
 * `range` Filtro whose field the data lacks is left out, like a table column.
 */
export function resolveFilters(
  definitions: readonly FilterDefinition[],
  data: CategoryData,
): CategoryFilter[] {
  const fieldsByKey = new Map(data.fields.map((field) => [field.key, field]));
  return definitions.flatMap((definition): CategoryFilter[] => {
    switch (definition.kind) {
      case "buckets": {
        const { buckets, ...rest } = definition;
        return [{ ...rest, choices: buckets }];
      }
      case "options": {
        const { fieldKey, ...rest } = definition;
        const field = fieldsByKey.get(fieldKey);
        return field ? [{ ...rest, choices: optionChoices(field, data.products) }] : [];
      }
      case "range":
        return fieldsByKey.get(definition.fieldKey)?.type === "number" ? [definition] : [];
    }
  });
}

function isOpenRange(range: NumberRange | undefined): boolean {
  return range === undefined || (range.min === undefined && range.max === undefined);
}

export function isFilterActive(filter: CategoryFilter, values: FilterValues): boolean {
  if (filter.kind === "range") return !isOpenRange(values.ranges[filter.param]);
  return (values.choices[filter.param]?.length ?? 0) > 0;
}

function passesFilter(product: Product, filter: CategoryFilter, values: FilterValues): boolean {
  if (filter.kind === "range") {
    const range = values.ranges[filter.param];
    const value = numberValue(product, filter.fieldKey);
    if (value === undefined || range === undefined) return false;
    return (
      (range.min === undefined || value >= range.min) &&
      (range.max === undefined || value <= range.max)
    );
  }
  const marked = values.choices[filter.param] ?? [];
  return filter.choices.some((choice) => marked.includes(choice.id) && choice.matches(product));
}

/** Produtos that pass every active Filtro. */
export function applyFilters(
  products: Product[],
  filters: readonly CategoryFilter[],
  values: FilterValues,
): Product[] {
  const active = filters.filter((filter) => isFilterActive(filter, values));
  if (active.length === 0) return products;
  return products.filter((product) =>
    active.every((filter) => passesFilter(product, filter, values)),
  );
}

export function activeFilterCount(
  filters: readonly CategoryFilter[],
  values: FilterValues,
): number {
  return filters.filter((filter) => isFilterActive(filter, values)).length;
}
