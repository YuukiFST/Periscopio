import type { CategorySlug } from "../categories.ts";
import type { CategoryData, Product } from "../data/schema.ts";
import { filterProducts } from "../product-table/product-filter.ts";

/** Few enough per Categoria that all three groups fit on a phone screen. */
export const resultsPerCategory = 5;

export type SearchResult = { category: CategorySlug; product: Product };
export type SearchResultGroup = { category: CategorySlug; items: SearchResult[] };

/**
 * The Produtos of every Categoria that match the search like the table's
 * search does, whatever their Status de teste; a Categoria with none is left out.
 */
export function searchAllCategories(
  categories: CategoryData[],
  searchText: string,
): SearchResultGroup[] {
  if (searchText.trim() === "") return [];
  return categories
    .map(({ category, products }) => ({
      category,
      items: filterProducts(products, "todos", searchText)
        .slice(0, resultsPerCategory)
        .map((product) => ({ category, product })),
    }))
    .filter((group) => group.items.length > 0);
}
