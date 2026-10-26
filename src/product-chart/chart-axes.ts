import { isRatingField } from "../data/rating-order.ts";
import type { CategoryData, Product } from "../data/schema.ts";
import { fieldLabel, unitLabel } from "../i18n/labels.ts";
import { highlightDirection, type HighlightDirection } from "../product-compare/highlight-rules.ts";
import { productFieldValue } from "../product-fields/field-groups.ts";
import {
  formatFieldValue,
  formatPrice,
  isCountEnum,
  priceOf,
  sortValueOf,
} from "../product-table/cell-values.ts";
import {
  tableColumnChoicesFor,
  tableColumnsFor,
  type TableColumn,
} from "../product-table/table-columns.ts";

type AxisColumn = Exclude<TableColumn, { kind: "product" }>;

/**
 * A number column of the Categoria table the Gráfico can plot on an axis,
 * named in the link (`x=preco`) by the table's column slug.
 */
export type ChartAxis = {
  slug: string;
  /** The column's name, with its unit when it has one: "Peso (g)". */
  label: string;
  column: AxisColumn;
  direction: HighlightDirection;
};

export type ChartAxisGroup = { title: string; axes: ChartAxis[] };

export const defaultXSlug = "preco";
export const defaultYSlug = "nota";

/** A column whose values are amounts or grades, so its Produtos line up on an axis. */
function isNumberColumn(column: AxisColumn): boolean {
  if (column.kind === "price") return true;
  const { field } = column;
  return field.type === "number" || isCountEnum(field) || isRatingField(field.key);
}

function axisOf(column: AxisColumn): ChartAxis {
  if (column.kind === "price") {
    // The Preço is no field, so the Destaque rules leave it out: a lower one is better.
    return { slug: column.slug, label: "Preço (₩)", column, direction: "lower" };
  }
  const unit = "unit" in column.field ? unitLabel(column.field.unit) : "";
  const name = fieldLabel(column.field);
  return {
    slug: column.slug,
    label: unit === "" ? name : `${name} (${unit})`,
    column,
    direction: highlightDirection(column.field.key),
  };
}

/** Every number column the table offers, in the "Colunas" menu's groups and order. */
export function chartAxisGroupsFor(data: CategoryData): ChartAxisGroup[] {
  const choices = tableColumnChoicesFor(data);
  return choices.groups.flatMap((group) => {
    const columns = tableColumnsFor(
      data,
      group.choices.map(({ key }) => key),
    );
    const axes = columns.flatMap((column) =>
      column.kind !== "product" && isNumberColumn(column) ? [axisOf(column)] : [],
    );
    return axes.length > 0 ? [{ title: group.title, axes }] : [];
  });
}

/** Every Produto has a Preço column, so the Gráfico always has an axis to fall back on. */
const priceAxis = axisOf({ kind: "price", slug: "preco" });

/** The axis a link's slug names, else the default one, else the Preço. */
export function chartAxisOf(
  groups: readonly ChartAxisGroup[],
  slug: string | undefined,
  defaultSlug: string,
): ChartAxis {
  const axes = groups.flatMap((group) => group.axes);
  return (
    axes.find((axis) => axis.slug === slug) ??
    axes.find((axis) => axis.slug === defaultSlug) ??
    priceAxis
  );
}

/** Where a Produto sits on the axis: an amount, or a grade's rank. Undefined without a value. */
export function axisValueOf(axis: ChartAxis, product: Product): number | undefined {
  const value = sortValueOf(axis.column, product);
  return typeof value === "number" ? value : undefined;
}

/** The Produto's value as the table shows it: "₩ 98.900", "54 g", "A+". */
export function axisValueText(axis: ChartAxis, product: Product): string {
  const { column } = axis;
  if (column.kind === "price") {
    const price = priceOf(product);
    return price === undefined ? "Sem dado" : formatPrice(price);
  }
  const value = productFieldValue(product, column.field);
  return value === undefined ? "Sem dado" : formatFieldValue(column.field, value);
}
