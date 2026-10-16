import type { CategoryData } from "../src/data/schema.ts";
import { fieldLabelsPt, unitLabelsPt } from "../src/i18n/pt-field-labels.ts";
import { valueLabelsPt } from "../src/i18n/pt-value-labels.ts";

/** ENUM fields whose values are proper names or numbers: they need no pt entry. */
const properNameEnumKeys = new Set([
  "sensor",
  "mouseMcu",
  "mcu",
  "maxPollingRate",
  "pollingRate",
  "effectiveUpdateRate",
  "battery",
  "switch",
  "sideSwitch",
  "encoder",
  "solution",
  "hdrCertification",
  "hdmiLinkClass",
  "displayPortLinkClass",
  "hdrFormatSupport",
  "resolution",
  "panelType",
]);

/** Free-text fields with short Korean texts repeated across Products. */
const shortTextKeys = new Set(["wheelSwitch", "soundAbsorption", "angleAdjustment", "switchType"]);

const hangul = /[ᄀ-ᇿ㄰-㆏가-힯]/;

function hasValueLabel(fieldKey: string, value: string): boolean {
  const labels = valueLabelsPt[fieldKey];
  return labels !== undefined && Object.hasOwn(labels, value);
}

/**
 * Keys the pt table lacks for this Categoria, as `campo:<key>`,
 * `unidade:<unit>` and `valor:<key>:<value>`, sorted.
 */
export function findUntranslatedKeys(data: CategoryData): string[] {
  const missing = new Set<string>();
  for (const field of data.fields) {
    if (!Object.hasOwn(fieldLabelsPt, field.key)) missing.add(`campo:${field.key}`);
    const unit = field.type === "enum" || field.type === "number" ? field.unit : null;
    if (unit !== null && hangul.test(unit) && !Object.hasOwn(unitLabelsPt, unit)) {
      missing.add(`unidade:${unit}`);
    }
    if (field.type === "enum" && !properNameEnumKeys.has(field.key)) {
      for (const option of field.options) {
        if (!hasValueLabel(field.key, option.value))
          missing.add(`valor:${field.key}:${option.value}`);
      }
    }
    if (field.type !== "text" || !shortTextKeys.has(field.key)) continue;
    for (const product of data.products) {
      const value = product.values[field.key];
      if (typeof value !== "string" || !hangul.test(value)) continue;
      if (!hasValueLabel(field.key, value)) missing.add(`valor:${field.key}:${value}`);
    }
  }
  return [...missing].toSorted();
}
