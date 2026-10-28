import { overallRatingKeys, type CategorySlug } from "../categories.ts";
import { ratingRank } from "../data/rating-order.ts";
import { isTested, type CategoryData, type Product } from "../data/schema.ts";
import { priceOf } from "../product-table/cell-values.ts";

/** How much each normalized difference counts in the distance between two Produtos. */
export const similarPriceWeight = 1;
export const similarRatingWeight = 1;
export const similarSpecWeight = 1;

/**
 * The one Especificação or Medição per Categoria that sets Produtos apart: Peso, Resposta
 * geral, Tamanho da tela, Atrito dinâmico, Força no fim do curso and Adequação ao Valorant.
 */
const specFieldKeys: Record<CategorySlug, string> = {
  mouse: "weight",
  teclado: "overallResponseSpeed",
  monitor: "sizeInch",
  mousepad: "dynamicFriction",
  switch: "bottomOutForce",
  fone: "earphoneValorantFrMatch",
};

type Point = { product: Product; price: number; rating: number; spec: number };

function pointOf(data: CategoryData, product: Product): Point | undefined {
  const price = priceOf(product);
  const ratingValue = product.values[overallRatingKeys[data.category]];
  // UNRATED ranks lowest in the sort order, but reads "Sem nota": no Nota geral to measure.
  const rating =
    typeof ratingValue === "string" && ratingValue !== "UNRATED"
      ? ratingRank(overallRatingKeys[data.category], ratingValue)
      : undefined;
  const spec = product.values[specFieldKeys[data.category]];
  if (price === undefined || rating === undefined || typeof spec !== "number") return undefined;
  return { product, price, rating, spec };
}

/** max - min of `values`; 0 when they are all equal, so that dimension adds nothing. */
function spread(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function normalizedGap(a: number, b: number, range: number): number {
  return range === 0 ? 0 : (a - b) / range;
}

/**
 * Up to `count` tested Produtos of `data` nearest to `product` over Preço,
 * Nota geral and the Categoria's one spec, each scaled by its spread among
 * `product` and the candidates. Produtos missing any of the three are left out, and so is
 * everything when `product` misses one. Ties go to the higher Nota geral.
 */
export function similarProducts(data: CategoryData, product: Product, count: number): Product[] {
  const origin = pointOf(data, product);
  if (!origin) return [];
  const candidates = data.products
    .filter((candidate) => candidate.id !== product.id && isTested(candidate))
    .map((candidate) => pointOf(data, candidate))
    .filter((point) => point !== undefined);
  if (candidates.length === 0) return [];
  const everyPoint = [origin, ...candidates];
  const priceRange = spread(everyPoint.map((point) => point.price));
  const ratingRange = spread(everyPoint.map((point) => point.rating));
  const specRange = spread(everyPoint.map((point) => point.spec));
  const distanceOf = (point: Point) =>
    Math.hypot(
      similarPriceWeight * normalizedGap(point.price, origin.price, priceRange),
      similarRatingWeight * normalizedGap(point.rating, origin.rating, ratingRange),
      similarSpecWeight * normalizedGap(point.spec, origin.spec, specRange),
    );
  return candidates
    .map((point) => ({ point, distance: distanceOf(point) }))
    .toSorted((a, b) => a.distance - b.distance || b.point.rating - a.point.rating)
    .slice(0, count)
    .map(({ point }) => point.product);
}
