import { isRatingField, ratingRank } from "../data/rating-order.ts";
import type { Field, FieldValue, Product } from "../data/schema.ts";
import { unitLabel, valueLabel } from "../i18n/labels.ts";
import type { TableColumn } from "./table-columns.ts";

const locale = "pt-BR";
const priceFormat = new Intl.NumberFormat(locale, { style: "currency", currency: "KRW" });
const listFormat = new Intl.ListFormat(locale, { type: "conjunction" });
const textCollator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
/** EyeJoker is a Korean site: its dates read as the day in Korea, wherever the app is opened. */
const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Seoul" });
const timeZoneSuffix = /(?:Z|[+-]\d{2}:\d{2})$/;

/** EyeJoker writes some dates without a time zone; those are Korean wall-clock times. */
function formatDate(value: string): string {
  const date = new Date(timeZoneSuffix.test(value) ? value : `${value}+09:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

/** Units written right after the number, without a space: `27″`, `95%`, `1000:1`. */
const unitsWithoutSpace = new Set(["″", "%", ":1"]);

const numberFormats = new Map<number | null, Intl.NumberFormat>();
function numberFormatFor(decimals: number | null): Intl.NumberFormat {
  let format = numberFormats.get(decimals);
  if (!format) {
    format = new Intl.NumberFormat(
      locale,
      decimals === null
        ? // Two decimals, unless that rounds a small value such as 0.001 mm away to 0.
          {
            maximumFractionDigits: 2,
            maximumSignificantDigits: 2,
            roundingPriority: "morePrecision",
          }
        : { minimumFractionDigits: decimals, maximumFractionDigits: decimals },
    );
    numberFormats.set(decimals, format);
  }
  return format;
}

const countPattern = /^\d+$/;
const countEnums = new WeakMap<Field, boolean>();

/** An enum whose options are bare counts labelled as themselves, such as the polling rate `8000`. */
export function isCountEnum(field: Field): boolean {
  if (field.type !== "enum") return false;
  let isCount = countEnums.get(field);
  if (isCount === undefined) {
    isCount =
      field.options.length > 0 &&
      field.options.every(
        (option) =>
          countPattern.test(option.value) &&
          (option.label === null || option.label.en === option.value),
      );
    countEnums.set(field, isCount);
  }
  return isCount;
}

function optionLabel(field: Field, option: string): string {
  return isCountEnum(field) && countPattern.test(option)
    ? numberFormatFor(null).format(Number(option))
    : valueLabel(field, option);
}

function withUnit(number: string, unit: string): string {
  if (unit === "") return number;
  return unitsWithoutSpace.has(unit) ? `${number}${unit}` : `${number} ${unit}`;
}

/** A field value as the table shows it, in pt, with the field's decimals and unit. */
export function formatFieldValue(field: Field, value: FieldValue): string {
  switch (field.type) {
    case "number":
      return typeof value === "number"
        ? withUnit(numberFormatFor(field.decimals).format(value), unitLabel(field.unit))
        : String(value);
    case "enum": {
      const labels = (Array.isArray(value) ? value : [String(value)]).map((option) =>
        optionLabel(field, option),
      );
      return withUnit(listFormat.format(labels), unitLabel(field.unit));
    }
    case "boolean":
      return value === true ? "Sim" : "Não";
    case "date":
      return typeof value === "string" ? formatDate(value) : String(value);
    case "text":
      return valueLabel(field, String(value));
  }
}

/**
 * A number field's value rounded the way `formatFieldValue` shows it, so two
 * values that read the same on screen compare as equal.
 */
export function roundedAsShown(field: Extract<Field, { type: "number" }>, value: number): number {
  const parts = numberFormatFor(field.decimals).formatToParts(value);
  return Number(
    parts
      .map((part) => (part.type === "group" ? "" : part.type === "decimal" ? "." : part.value))
      .join(""),
  );
}

/** The Preço to show; EyeJoker stores 0 for a Produto it no longer prices, which reads as no Preço. */
export function priceOf(product: Product): number | undefined {
  return product.priceKrw || undefined;
}

export function formatPrice(priceKrw: number): string {
  return priceFormat.format(priceKrw);
}

/** Bare number for a deviation shown beside its average, as in `σ 0,05`. */
export function formatDeviation(field: Field, value: FieldValue | undefined): string | undefined {
  if (typeof value !== "number" || field.type !== "number") return undefined;
  return numberFormatFor(field.decimals).format(value);
}

export type SortValue = number | string | undefined;

/** What a column sorts by: numbers and grade ranks as numbers, the rest by its pt text. */
export function sortValueOf(column: TableColumn, product: Product): SortValue {
  switch (column.kind) {
    case "product":
      return product.name;
    case "price":
      return priceOf(product);
    case "field": {
      const value = product.values[column.field.key];
      if (value === undefined) return undefined;
      if (typeof value === "number") return value;
      if (typeof value === "string" && isCountEnum(column.field) && countPattern.test(value)) {
        return Number(value);
      }
      if (typeof value === "string" && isRatingField(column.field.key)) {
        return ratingRank(column.field.key, value);
      }
      return formatFieldValue(column.field, value);
    }
  }
}

/** Ascending order of two present sort values; the table reverses it for descending. */
export function compareSortValues(a: SortValue, b: SortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return textCollator.compare(String(a), String(b));
}
