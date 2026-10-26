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
 * The `products` that match the search like the table's search does,
 * whatever their Status de teste, best matches first; none for an empty search.
 */
export function rankedProductMatches(products: readonly Product[], searchText: string): Product[] {
  const query = normalizedWords(searchText);
  if (query === "") return [];
  return filterProducts([...products], "todos", searchText)
    .map((product) => ({ product, rank: resultRank(product, query) }))
    .toSorted((left, right) => left.rank - right.rank)
    .map(({ product }) => product);
}

/**
 * The best matches of every Categoria, as `rankedProductMatches` finds them;
 * a Categoria with none is left out.
 */
export function searchAllCategories(
  categories: CategoryData[],
  searchText: string,
): SearchResultGroup[] {
  return categories
    .map(({ category, products }) => ({
      category,
      items: rankedProductMatches(products, searchText)
        .slice(0, resultsPerCategory)
        .map((product) => ({ category, product })),
    }))
    .filter((group) => group.items.length > 0);
}
