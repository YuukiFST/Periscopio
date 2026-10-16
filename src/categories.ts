export const categorySlugs = ["mouse", "teclado", "monitor"] as const;

export type CategorySlug = (typeof categorySlugs)[number];

export const categoryLabels: Record<CategorySlug, string> = {
  mouse: "Mouses",
  teclado: "Teclados",
  monitor: "Monitores",
};

export function isCategorySlug(value: string): value is CategorySlug {
  return categorySlugs.some((slug) => slug === value);
}
