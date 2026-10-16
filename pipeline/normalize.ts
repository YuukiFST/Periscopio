import { z } from "zod";
import type { CategorySlug } from "../src/categories.ts";
import {
  fieldGroups,
  type CategoryData,
  type Field,
  type FieldGroup,
  type FieldOption,
  type FieldValue,
  type LocalizedText,
  type Product,
} from "../src/data/schema.ts";
import type {
  EyejokerCompany,
  EyejokerField,
  EyejokerRow,
  EyejokerSnapshot,
} from "./eyejoker-api.ts";
import { UpdateRefusedError } from "./update-refused-error.ts";

/** Free text, internal data and raw prices the app never shows. */
const omittedFieldKeys = new Set([
  "oneLineNote",
  "tag",
  "youtubeReviewUrl",
  "driverLinkId",
  "benchVersion",
  "purchasedDate",
  "arrivedDate",
  "testingStartDate",
  "price",
  "priceCurrency",
]);

/** Fields that become top-level Product properties instead of `values`. */
const productNameKey = "productName";
const manufacturerKey = "manufacturer";
const productImageKey = "productImage";
const statusKey = "status";
const saleStatusKey = "saleStatus";
const productPropertyKeys = new Set([productNameKey, manufacturerKey, productImageKey]);
const productPropertyFieldKeys = new Set([statusKey, saleStatusKey]);

const fieldTypeByDataType = {
  STRING: "text",
  ENUM: "enum",
  NUMBER: "number",
  BOOLEAN: "boolean",
  DATETIME: "date",
  FILE: null,
  COMPANY: null,
} as const satisfies Record<EyejokerField["dataType"], Field["type"] | null>;

const numberTextSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/)
  .transform(Number);
const booleanTextSchema = z.enum(["true", "false"]).transform((text) => text === "true");
const dateTextSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/);
const productImagePathSchema = z.string().regex(/^\/([0-9a-f-]{36})\.avif$/);

export type NormalizedCategory = {
  data: CategoryData;
  /** EyeJoker fields with no normalized type (FILE, COMPANY) beyond the known ones. */
  ignoredFieldKeys: string[];
  /** Products whose photo URL is not a `<uuid>.avif` file. */
  unusableImageProductIds: string[];
};

type FieldSource = { group: FieldGroup; definition: EyejokerField };

/** Code-unit order, so the output is the same on every machine and locale. */
export function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function sortFieldSources(snapshot: EyejokerSnapshot): FieldSource[] {
  const sources = fieldGroups.flatMap((group) =>
    snapshot.detailColumns[group].map((definition) => ({ group, definition })),
  );
  return sources.toSorted(
    (left, right) =>
      fieldGroups.indexOf(left.group) - fieldGroups.indexOf(right.group) ||
      left.definition.detailOrder - right.definition.detailOrder ||
      compareText(left.definition.field, right.definition.field),
  );
}

function splitEnumText(text: string, multiple: boolean): string[] {
  const parts = multiple ? text.split(",") : [text];
  return [...new Set(parts.map((part) => part.trim()).filter((part) => part !== ""))];
}

function localizedText(names: { ko: string; en: string }): LocalizedText {
  return { ko: names.ko, en: names.en };
}

function unitFrom(suffix: string | null): string | null {
  const unit = suffix?.trim() ?? "";
  return unit === "" ? null : unit;
}

function buildField(source: FieldSource, rows: EyejokerRow[]): Field | null {
  const { group, definition } = source;
  const type = fieldTypeByDataType[definition.dataType];
  if (type === null) return null;
  const base = { key: definition.field, group, label: localizedText(definition.names) };
  switch (type) {
    case "enum":
      return {
        ...base,
        type,
        unit: unitFrom(definition.suffix),
        multiple: definition.multiSelect,
        options: buildOptions(definition, rows),
      };
    case "number":
      return {
        ...base,
        type,
        unit: unitFrom(definition.suffix),
        decimals: definition.decimalPlaces,
      };
    case "boolean":
    case "text":
    case "date":
      return { ...base, type };
  }
}

/** EyeJoker's option list, then the values rows use that the list leaves out. */
function buildOptions(definition: EyejokerField, rows: EyejokerRow[]): FieldOption[] {
  const options = new Map<string, FieldOption>();
  for (const item of definition.dataList) {
    if (options.has(item.field)) continue;
    options.set(item.field, { value: item.field, label: localizedText(item.names) });
  }
  const unlisted = new Set<string>();
  for (const row of rows) {
    const text = row.values[definition.field] ?? "";
    for (const value of splitEnumText(text, definition.multiSelect)) {
      if (!options.has(value)) unlisted.add(value);
    }
  }
  for (const value of [...unlisted].toSorted()) options.set(value, { value, label: null });
  return [...options.values()];
}

function refuseValue(slug: CategorySlug, row: EyejokerRow, field: Field, text: string): never {
  throw new UpdateRefusedError(
    `${slug}: o Produto ${row.id} tem "${text}" em ${field.key}, que não é um valor ${field.type} válido.`,
  );
}

function parseFieldValue(
  slug: CategorySlug,
  row: EyejokerRow,
  field: Field,
  text: string,
): FieldValue | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  switch (field.type) {
    case "enum": {
      const values = splitEnumText(trimmed, field.multiple);
      if (values.length === 0) return null;
      return field.multiple ? values : trimmed;
    }
    case "text":
      return trimmed;
    case "number": {
      const result = numberTextSchema.safeParse(trimmed);
      return result.success ? result.data : refuseValue(slug, row, field, text);
    }
    case "boolean": {
      const result = booleanTextSchema.safeParse(trimmed);
      return result.success ? result.data : refuseValue(slug, row, field, text);
    }
    case "date": {
      const result = dateTextSchema.safeParse(trimmed);
      return result.success ? result.data : refuseValue(slug, row, field, text);
    }
  }
}

function buildValues(slug: CategorySlug, row: EyejokerRow, valueFields: Field[]) {
  const values: Record<string, FieldValue> = {};
  for (const field of valueFields.toSorted((left, right) => compareText(left.key, right.key))) {
    const value = parseFieldValue(slug, row, field, row.values[field.key] ?? "");
    if (value !== null) values[field.key] = value;
  }
  return values;
}

function imagePathFrom(url: string): string | null | undefined {
  if (url.trim() === "") return null;
  if (!URL.canParse(url)) return undefined;
  const match = productImagePathSchema.safeParse(new URL(url).pathname);
  return match.success ? `/images${match.data}` : undefined;
}

function aliUrlFrom(row: EyejokerRow): string | null {
  const aliLink = row.affiliateLinks?.find((link) => link.platform === "ALI");
  return aliLink?.affiliateUrl ?? null;
}

function optionalText(text: string | undefined): string | null {
  const trimmed = text?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function normalizeCategory(
  slug: CategorySlug,
  snapshot: EyejokerSnapshot,
  companies: ReadonlyMap<string, EyejokerCompany>,
): NormalizedCategory {
  const fields: Field[] = [];
  const ignoredFieldKeys: string[] = [];
  for (const source of sortFieldSources(snapshot)) {
    const key = source.definition.field;
    if (omittedFieldKeys.has(key) || productPropertyKeys.has(key)) continue;
    const field = buildField(source, snapshot.rows);
    if (field) fields.push(field);
    else ignoredFieldKeys.push(key);
  }
  const valueFields = fields.filter((field) => !productPropertyFieldKeys.has(field.key));

  const unusableImageProductIds: string[] = [];
  const products: Product[] = [];
  for (const row of snapshot.rows) {
    const name = optionalText(row.values[productNameKey]);
    if (name === null) throw new UpdateRefusedError(`${slug}: o Produto ${row.id} não tem nome.`);
    const manufacturerId = row.values[manufacturerKey] ?? "";
    const company = companies.get(manufacturerId);
    if (!company) {
      throw new UpdateRefusedError(
        `${slug}: o fabricante "${manufacturerId}" do Produto ${row.id} não está em /api/company.`,
      );
    }
    const image = imagePathFrom(row.values[productImageKey] ?? "");
    if (image === undefined) unusableImageProductIds.push(row.id);
    products.push({
      id: row.id,
      name,
      manufacturer: localizedText(company.names),
      priceKrw: row.priceKrw === undefined ? null : Math.round(row.priceKrw / 100) * 100,
      status: optionalText(row.values[statusKey]),
      saleStatus: optionalText(row.values[saleStatusKey]),
      aliUrl: aliUrlFrom(row),
      image: image ?? null,
      values: buildValues(slug, row, valueFields),
    });
  }
  products.sort((left, right) => compareText(left.id, right.id));

  return { data: { category: slug, fields, products }, ignoredFieldKeys, unusableImageProductIds };
}
