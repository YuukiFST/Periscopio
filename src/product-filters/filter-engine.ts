import type { CategoryData, Field, Product } from "../data/schema.ts";
import { valueLabel } from "../i18n/labels.ts";
import { roundedAsShown } from "../product-table/cell-values.ts";
import type { FilterParam } from "./filter-params.ts";

/**
 * Filtros are data: each Categoria declares a list of definitions, and one
 * pure engine applies them. Within a Filtro the marked choices add up (OU);
 * across Filtros they narrow (E); a Produto without the value a Filtro reads
 * never passes it while it is active, as on the Fonte.
 */

/** One choice of a list Filtro; `id` is its name in the link (`formato=simetrico`). */
export type FilterChoice = {
  id: string;
  label: string;
  matches: (product: Product) => boolean;
};

type DefinitionBase = {
  param: FilterParam;
  label: string;
};

/** Named groups with their own rule, the Fonte's cuts (connection, size by volume). */
export type BucketsDefinition = DefinitionBase & {
  kind: "buckets";
  buckets: readonly FilterChoice[];
};

/** The values of an ENUM field that some Produto has, each one a choice. */
export type OptionsDefinition = DefinitionBase & { kind: "options"; fieldKey: string };

/**
 * Minimum and maximum, both optional, of a number field or of a number the
 * Produto holds outside its fields (the Preço), read by `readValue`.
 */
export type RangeDefinition = DefinitionBase & { kind: "range"; unit: string } & (
    | { fieldKey: string }
    | { readValue: (product: Product) => number | undefined }
  );

export type FilterDefinition = BucketsDefinition | OptionsDefinition | RangeDefinition;

/** A Filtro ready for one Categoria's data: options turned into choices. */
export type ChoiceFilter = DefinitionBase & {
  kind: "buckets" | "options";
  choices: readonly FilterChoice[];
};
export type RangeFilter = DefinitionBase & {
  kind: "range";
  unit: string;
  readValue: (product: Product) => number | undefined;
};
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

/** The field's values some Produto has, by label: the Fonte's own option order is not sorted. */
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
      case "range": {
        const { param, label, unit } = definition;
        if ("readValue" in definition)
          return [{ kind: "range", param, label, unit, readValue: definition.readValue }];
        const field = fieldsByKey.get(definition.fieldKey);
        if (field?.type !== "number") return [];
        // The bounds are typed from what the table shows, so the value is read rounded the same way.
        const readValue = (product: Product) => {
          const value = numberValue(product, field.key);
          return value === undefined ? undefined : roundedAsShown(field, value);
        };
        return [{ kind: "range", param, label, unit, readValue }];
      }
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
    const value = filter.readValue(product);
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
