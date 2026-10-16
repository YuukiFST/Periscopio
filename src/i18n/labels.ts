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

/** One ENUM or short-text value: pt, then EyeJoker's en, ko, then the raw value. */
export function valueLabel(field: Field, value: string): string {
  const pt = valueLabelsPt[field.key]?.[value];
  if (pt !== undefined) return pt;
  if (field.type !== "enum") return value;
  const option = field.options.find((candidate) => candidate.value === value);
  return eyejokerLabel(option?.label ?? null) ?? value;
}

/** The manufacturer by its English name, Korean only when English is missing. */
export function manufacturerName(manufacturer: LocalizedText): string {
  return manufacturer.en || manufacturer.ko;
}
