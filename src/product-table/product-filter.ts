import type { Product } from "../data/schema.ts";

export const testStatusFilters = ["testados", "nao-testados"] as const;
export type TestStatusFilter = (typeof testStatusFilters)[number];

/** EyeJoker's `reviewed` is the published review; every other status still awaits a full test. */
function isTested(product: Product): boolean {
  return product.status === "reviewed";
}

export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

/**
 * Products that pass the Status de teste and the search. Every word of the
 * search must appear in the Product name or the manufacturer name (en or ko).
 */
export function filterProducts(
  products: Product[],
  testStatus: TestStatusFilter | undefined,
  searchText: string,
): Product[] {
  const words = normalizeForSearch(searchText).split(/\s+/).filter(Boolean);
  if (testStatus === undefined && words.length === 0) return products;
  return products.filter((product) => {
    if (testStatus === "testados" && !isTested(product)) return false;
    if (testStatus === "nao-testados" && isTested(product)) return false;
    if (words.length === 0) return true;
    const haystack = normalizeForSearch(
      `${product.name} ${product.manufacturer.en} ${product.manufacturer.ko}`,
    );
    return words.every((word) => haystack.includes(word));
  });
}
