import type { Field, LocalizedText } from "../data/schema.ts";
import { fieldLabelsPt, unitLabelsPt } from "./pt-field-labels.ts";
import { valueLabelsPt } from "./pt-value-labels.ts";

/** EyeJoker's own label in the order pt falls back to: en, then ko. */
function eyejokerLabel(label: LocalizedText | null): string | undefined {
  return label?.en || label?.ko || undefined;
}

/** A field's label: pt, then EyeJoker's en, ko, then the raw key. */
export function fieldLabel(field: Field): string {
  return fieldLabelsPt[field.key] ?? eyejokerLabel(field.label) ?? field.key;
}

/** A unit in pt; an empty string means Portuguese drops it. */
export function unitLabel(unit: string | null): string {
  if (unit === null) return "";
  return unitLabelsPt[unit] ?? unit;
}

/** An id such as `huanoMicroWhiteDot`, which EyeJoker sometimes gives as the label, maybe followed by words. */
const camelCaseId = /^[a-z]+(?:[A-Z0-9][a-z0-9]+)+(?= |$)/;
const acronyms = new Set(["ttc"]);
/** Brands whose ids lose the casing EyeJoker gives them elsewhere. */
const brandCasing: Readonly<Record<string, string>> = { chanfen: "ChanFen", himake: "HIMAKE" };

/** `huanoMicroWhiteDot` as "Huano Micro White Dot", so a raw id reads as a name. */
function readableId(label: string): string {
  return label.replace(camelCaseId, (id) =>
    id
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(" ")
      .map((word, index) => {
        if (acronyms.has(word)) return word.toUpperCase();
        const brand = brandCasing[word];
        if (brand !== undefined) return brand;
        return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
      })
      .join(" "),
  );
}

/** One ENUM or short-text value: pt, then EyeJoker's en, ko, then the raw value. */
export function valueLabel(field: Field, value: string): string {
  const pt = valueLabelsPt[field.key]?.[value];
  if (pt !== undefined) return pt;
  if (field.type !== "enum") return value;
  const option = field.options.find((candidate) => candidate.value === value);
  // A space before the unit, as every other figure has: "500mAh" as "500 mAh".
  return readableId(eyejokerLabel(option?.label ?? null) ?? value).replace(
    /(\d)(mAh|mm)\b/g,
    "$1 $2",
  );
}

/** The manufacturer by its English name, Korean only when English is missing. */
export function manufacturerName(manufacturer: LocalizedText): string {
  return manufacturer.en || manufacturer.ko;
}
