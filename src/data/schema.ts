import { z } from "zod";
import { categorySlugs } from "../categories.ts";

/**
 * Normalized data format written by the update pipeline to `public/data/` and
 * read by the app. Imported with relative paths and erasable TypeScript only,
 * because the pipeline runs this file directly under Node's type stripping.
 */

export const categorySlugSchema = z.enum(categorySlugs);

export const localizedTextSchema = z.strictObject({ ko: z.string(), en: z.string() });
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const fieldGroups = ["common", "spec", "bench"] as const;
export const fieldGroupSchema = z.enum(fieldGroups);
export type FieldGroup = z.infer<typeof fieldGroupSchema>;

const fieldKeySchema = z.string().min(1);
const unitSchema = z.string().min(1).nullable();

/** `label` is null for a value the Fonte uses but leaves out of its option list. */
export const fieldOptionSchema = z.strictObject({
  value: z.string().min(1),
  label: localizedTextSchema.nullable(),
});
export type FieldOption = z.infer<typeof fieldOptionSchema>;

const fieldBase = { key: fieldKeySchema, group: fieldGroupSchema, label: localizedTextSchema };

export const fieldSchema = z.discriminatedUnion("type", [
  z.strictObject({
    ...fieldBase,
    type: z.literal("enum"),
    unit: unitSchema,
    multiple: z.boolean(),
    options: z.array(fieldOptionSchema),
  }),
  z.strictObject({
    ...fieldBase,
    type: z.literal("number"),
    unit: unitSchema,
    decimals: z.int().nonnegative().nullable(),
  }),
  z.strictObject({ ...fieldBase, type: z.literal("boolean") }),
  z.strictObject({ ...fieldBase, type: z.literal("text") }),
  z.strictObject({ ...fieldBase, type: z.literal("date") }),
]);
export type Field = z.infer<typeof fieldSchema>;
export type FieldType = Field["type"];

/** Empty values are left out of `values`, so every present key holds data. */
export const fieldValueSchema = z.union([
  z.string().min(1),
  z.number(),
  z.boolean(),
  z.array(z.string().min(1)).min(1),
]);
export type FieldValue = z.infer<typeof fieldValueSchema>;

/** The Link AliExpress: `https` on aliexpress.com or a subdomain, such as s.click.aliexpress.com. */
export const aliUrlSchema = z.url({
  protocol: /^https$/,
  hostname: /^(?:[a-z0-9-]+\.)*aliexpress\.com$/,
});

export const productSchema = z.strictObject({
  id: z.guid(),
  name: z.string().min(1),
  manufacturer: localizedTextSchema,
  priceKrw: z.int().nonnegative().multipleOf(100).nullable(),
  status: z.string().min(1).nullable(),
  saleStatus: z.string().min(1).nullable(),
  aliUrl: aliUrlSchema.nullable(),
  image: z
    .string()
    .regex(/^\/images\/[0-9a-f-]{36}\.avif$/)
    .nullable(),
  values: z.record(fieldKeySchema, fieldValueSchema),
  /**
   * The Atualização that first published the Produto, and the one where its
   * Status de teste became tested. Null when it predates both fields; absent
   * from data written before them.
   */
  firstSeenAt: z.iso.datetime().nullable().optional(),
  testedAt: z.iso.datetime().nullable().optional(),
});
export type Product = z.infer<typeof productSchema>;

/** The Fonte's `reviewed` is the published review; every other status still awaits a full test. */
export function isTested(product: Pick<Product, "status">): boolean {
  return product.status === "reviewed";
}

function valueMatchesField(value: FieldValue, field: Field): boolean {
  switch (field.type) {
    case "enum":
      return field.multiple ? Array.isArray(value) : typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "text":
    case "date":
      return typeof value === "string";
  }
}

export const categoryDataSchema = z
  .strictObject({
    category: categorySlugSchema,
    fields: z.array(fieldSchema),
    products: z.array(productSchema),
  })
  .superRefine((data, context) => {
    const fieldsByKey = new Map(data.fields.map((field) => [field.key, field]));
    for (const [index, product] of data.products.entries()) {
      for (const [key, value] of Object.entries(product.values)) {
        const field = fieldsByKey.get(key);
        if (field && valueMatchesField(value, field)) continue;
        context.addIssue({
          code: "custom",
          path: ["products", index, "values", key],
          message: field
            ? `value does not match field type "${field.type}"`
            : "value has no field definition",
        });
      }
    }
  });
export type CategoryData = z.infer<typeof categoryDataSchema>;

/** The Cotação: how many reais one won bought on `date`, as `source` published it. */
export const krwBrlRateSchema = z.strictObject({
  rate: z.number().positive(),
  date: z.iso.date(),
  source: z.string().min(1),
});
export type KrwBrlRate = z.infer<typeof krwBrlRateSchema>;

export const metaSchema = z.strictObject({
  updatedAt: z.iso.datetime(),
  counts: z.strictObject({
    mouse: z.int().nonnegative(),
    teclado: z.int().nonnegative(),
    monitor: z.int().nonnegative(),
  }),
  /** Absent from a `meta.json` written before the Cotação, and until a fetch succeeds. */
  krwBrl: krwBrlRateSchema.optional(),
});
export type Meta = z.infer<typeof metaSchema>;

/** About a year of weekly Atualizações. */
export const maxPriceEntries = 52;

/** The Preço one Atualização recorded, on the day (UTC) it ran. */
export const priceEntrySchema = z.strictObject({
  date: z.iso.date(),
  priceKrw: z.int().positive().multipleOf(100),
});
export type PriceEntry = z.infer<typeof priceEntrySchema>;

/**
 * The Histórico de preço of a Categoria, in `public/data/precos/<categoria>.json`:
 * per Produto id, oldest first, one entry each time the Preço changed.
 */
export const priceHistorySchema = z.strictObject({
  category: categorySlugSchema,
  products: z.record(z.guid(), z.array(priceEntrySchema).min(1).max(maxPriceEntries)),
});
export type PriceHistory = z.infer<typeof priceHistorySchema>;
