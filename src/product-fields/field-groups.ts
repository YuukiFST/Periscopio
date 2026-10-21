import { isRatingField } from "../data/rating-order.ts";
import type { CategoryData, Field, FieldValue, Product } from "../data/schema.ts";

export type ProductFieldGroupId = "especificacoes" | "medicoes";

/** One titled group of fields, in the order a Produto screen lists them. */
export type ProductFieldGroup = { id: ProductFieldGroupId; title: string; fields: Field[] };

function isOverallRating(field: Field): boolean {
  return field.key.startsWith("overallRating");
}

/** Shown with the name in the Produto header, so no group repeats it. */
const headerFieldKeys = new Set(["status"]);

/**
 * True when `value` is EyeJoker's mark for a time it could not measure: -1
 * (`pcbAvgWired: -1`), or 0 on anything but a debounce, which a switch with
 * none really measures at 0 ms.
 */
export function isPlaceholderTime(field: Field, value: FieldValue): boolean {
  if (field.type !== "number" || field.unit !== "ms" || typeof value !== "number") return false;
  return value < 0 || (value === 0 && !/debounce/i.test(field.key));
}

/**
 * A Produto's value for a field. The pipeline keeps the Status de teste and
 * the situação de venda beside `values`; every other field lives in it. A
 * placeholder time is no value.
 */
export function productFieldValue(product: Product, field: Field): FieldValue | undefined {
  if (field.key === "status") return product.status ?? undefined;
  if (field.key === "saleStatus") return product.saleStatus ?? undefined;
  const value = product.values[field.key];
  return value === undefined || isPlaceholderTime(field, value) ? undefined : value;
}

/**
 * Especificações (EyeJoker's `common` and `spec` fields, grades first) and
 * Medições (its `bench` fields), each keeping only the fields at least one of
 * `products` has a value for; a group left without fields is dropped.
 */
export function productFieldGroups(
  data: CategoryData,
  products: readonly Product[],
): ProductFieldGroup[] {
  const shown = data.fields.filter(
    (field) =>
      !headerFieldKeys.has(field.key) &&
      products.some((product) => productFieldValue(product, field) !== undefined),
  );
  // Nota geral before Recomendação, the order of the table's leading columns.
  const grades = shown
    .filter((field) => isRatingField(field.key))
    .toSorted((a, b) => Number(isOverallRating(b)) - Number(isOverallRating(a)));
  const declared = (group: Field["group"]) =>
    shown.filter((field) => field.group === group && !isRatingField(field.key));
  const groups: ProductFieldGroup[] = [
    {
      id: "especificacoes",
      title: "Especificações",
      fields: [...grades, ...declared("spec"), ...declared("common")],
    },
    { id: "medicoes", title: "Medições", fields: declared("bench") },
  ];
  return groups.filter((group) => group.fields.length > 0);
}
