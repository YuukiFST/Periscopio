import type { CategoryData, Field, FieldValue } from "../data/schema.ts";
import { highlightDirection, type HighlightDirection } from "../product-compare/highlight-rules.ts";
import { productFieldValue } from "../product-fields/field-groups.ts";
import { roundedAsShown } from "./cell-values.ts";

/** A number field's lowest and highest value in the Categoria, and which end is better. */
export type FieldRange = {
  min: number;
  max: number;
  direction: Exclude<HighlightDirection, "none">;
};

const rangesByData = new WeakMap<CategoryData, ReadonlyMap<string, FieldRange>>();

/**
 * The range of each number field with a better direction, over every Produto
 * of the Categoria, filtered or not, so a Filtro never moves a bar. Values are
 * taken as the screen rounds them, like the Destaque. Worked out once per data
 * load; a field whose Produtos all show one value has none.
 */
function fieldRangesOf(data: CategoryData): ReadonlyMap<string, FieldRange> {
  let ranges = rangesByData.get(data);
  if (ranges) return ranges;
  const found = new Map<string, FieldRange>();
  for (const field of data.fields) {
    const direction = highlightDirection(field.key);
    if (field.type !== "number" || direction === "none") continue;
    let min = Infinity;
    let max = -Infinity;
    for (const product of data.products) {
      const value = productFieldValue(product, field);
      if (typeof value !== "number") continue;
      const shown = roundedAsShown(field, value);
      min = Math.min(min, shown);
      max = Math.max(max, shown);
    }
    if (min < max) found.set(field.key, { min, max, direction });
  }
  ranges = found;
  rangesByData.set(data, ranges);
  return ranges;
}

export function fieldRangeOf(data: CategoryData, field: Field): FieldRange | undefined {
  return fieldRangesOf(data).get(field.key);
}

/**
 * Where `value` sits in `range`, from 0 (the Categoria's worst value of the
 * field) to 1 (its best). Undefined without a range.
 */
export function rangePositionOf(
  range: FieldRange | undefined,
  field: Field,
  value: FieldValue,
): number | undefined {
  if (!range || field.type !== "number" || typeof value !== "number") return undefined;
  const fromMin = (roundedAsShown(field, value) - range.min) / (range.max - range.min);
  return range.direction === "lower" ? 1 - fromMin : fromMin;
}
