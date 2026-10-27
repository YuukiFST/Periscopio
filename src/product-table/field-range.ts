import type { CategoryData, Field, FieldValue } from "../data/schema.ts";
import { highlightDirection } from "../product-compare/highlight-rules.ts";
import { productFieldValue } from "../product-fields/field-groups.ts";

type FieldRange = { min: number; max: number };

const rangesByData = new WeakMap<CategoryData, ReadonlyMap<string, FieldRange>>();

/**
 * The lowest and highest value of each number field over every Produto of the
 * Categoria, filtered or not, so a Filtro never moves a bar. Worked out once
 * per data load.
 */
function fieldRangesOf(data: CategoryData): ReadonlyMap<string, FieldRange> {
  let ranges = rangesByData.get(data);
  if (ranges) return ranges;
  const found = new Map<string, FieldRange>();
  for (const field of data.fields) {
    if (field.type !== "number" || highlightDirection(field.key) === "none") continue;
    let min = Infinity;
    let max = -Infinity;
    for (const product of data.products) {
      const value = productFieldValue(product, field);
      if (typeof value !== "number") continue;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    if (min < max) found.set(field.key, { min, max });
  }
  ranges = found;
  rangesByData.set(data, ranges);
  return ranges;
}

/**
 * Where `value` sits in the Categoria, from 0 (its worst value of the field)
 * to 1 (its best). Undefined for a field that is no number, has no better
 * direction, or holds one value across the Categoria.
 */
export function rangePositionOf(
  data: CategoryData,
  field: Field,
  value: FieldValue,
): number | undefined {
  const range = fieldRangesOf(data).get(field.key);
  if (!range || typeof value !== "number") return undefined;
  const fromMin = (value - range.min) / (range.max - range.min);
  return highlightDirection(field.key) === "lower" ? 1 - fromMin : fromMin;
}
