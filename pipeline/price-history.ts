import type { CategorySlug } from "../src/categories.ts";
import {
  maxPriceEntries,
  type PriceEntry,
  type PriceHistory,
  type Product,
} from "../src/data/schema.ts";

/** The Preço of each Produto one Atualização published for a Categoria. */
export type PublishedPrices = {
  category: CategorySlug;
  products: readonly Pick<Product, "id" | "priceKrw">[];
};

/**
 * Adds the Preço of the day, unless it equals the last one. A second
 * Atualização on the same day replaces that day's entry instead of adding one.
 */
function withPrice(entries: readonly PriceEntry[], priceKrw: number, date: string): PriceEntry[] {
  const earlier = entries.at(-1)?.date === date ? entries.slice(0, -1) : entries;
  if (earlier.at(-1)?.priceKrw === priceKrw) return [...earlier];
  return [...earlier, { date, priceKrw }].slice(-maxPriceEntries);
}

/**
 * The Histórico de preço after an Atualização on `date` (`YYYY-MM-DD`): the
 * Produtos that left the Categoria are dropped, and one without a Preço now
 * keeps the entries it had.
 */
export function nextPriceHistory(
  previous: PriceHistory | null,
  published: PublishedPrices,
  date: string,
): PriceHistory {
  const products: PriceHistory["products"] = {};
  for (const { id, priceKrw } of published.products) {
    const entries = previous?.products[id] ?? [];
    const next = priceKrw ? withPrice(entries, priceKrw, date) : entries;
    if (next.length > 0) products[id] = next;
  }
  return { category: published.category, products };
}
