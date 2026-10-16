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

/** `label` is null for a value EyeJoker uses but leaves out of its option list. */
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

export const productSchema = z.strictObject({
  id: z.guid(),
  name: z.string().min(1),
  manufacturer: localizedTextSchema,
  priceKrw: z.int().nonnegative().multipleOf(100).nullable(),
  status: z.string().min(1).nullable(),
  saleStatus: z.string().min(1).nullable(),
  aliUrl: z.url().nullable(),
  image: z
    .string()
    .regex(/^\/images\/[0-9a-f-]{36}\.avif$/)
    .nullable(),
  values: z.record(fieldKeySchema, fieldValueSchema),
});
export type Product = z.infer<typeof productSchema>;

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

export const metaSchema = z.strictObject({
  updatedAt: z.iso.datetime(),
  counts: z.strictObject({
    mouse: z.int().nonnegative(),
    teclado: z.int().nonnegative(),
    monitor: z.int().nonnegative(),
  }),
});
export type Meta = z.infer<typeof metaSchema>;
