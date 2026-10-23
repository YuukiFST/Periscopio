import type { CategorySlug } from "../categories.ts";
import { isTested, type CategoryData, type Product } from "../data/schema.ts";
import { manufacturerName } from "../i18n/labels.ts";
import { filterProducts, normalizeForSearch } from "../product-table/product-filter.ts";

/** Few enough per Categoria that all three groups fit on a phone screen. */
export const resultsPerCategory = 5;

export type SearchResult = { category: CategorySlug; product: Product };
export type SearchResultGroup = { category: CategorySlug; items: SearchResult[] };

function normalizedWords(text: string): string {
  return normalizeForSearch(text).split(/\s+/).filter(Boolean).join(" ");
}

/**
 * Lower ranks first: the whole name typed (alone or after the manufacturer),
 * then the start of the name; within a rank, a tested Produto comes first.
 */
function resultRank(product: Product, query: string): number {
  const name = normalizedWords(product.name);
  const fullName = normalizedWords(`${manufacturerName(product.manufacturer)} ${product.name}`);
  const nameRank = name === query || fullName === query ? 0 : name.startsWith(query) ? 1 : 2;
  return nameRank * 2 + (isTested(product) ? 0 : 1);
}

/**
 * The Produtos of every Categoria that match the search like the table's
 * search does, whatever their Status de teste, best matches first; a
 * Categoria with none is left out.
 */
export function searchAllCategories(
  categories: CategoryData[],
  searchText: string,
): SearchResultGroup[] {
  const query = normalizedWords(searchText);
  if (query === "") return [];
  return categories
    .map(({ category, products }) => ({
      category,
      items: filterProducts(products, "todos", searchText)
        .map((product) => ({ product, rank: resultRank(product, query) }))
        .toSorted((left, right) => left.rank - right.rank)
        .slice(0, resultsPerCategory)
        .map(({ product }) => ({ category, product })),
    }))
    .filter((group) => group.items.length > 0);
}
