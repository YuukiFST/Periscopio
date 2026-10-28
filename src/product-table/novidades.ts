import { isTested, type Product } from "../data/schema.ts";

const dayMs = 24 * 60 * 60 * 1000;
/** A Produto stays a Novidade for the 14 days before the Atualização. */
const novidadeWindowDays = 14;

export type Novidade = "novo" | "testado-agora";

export const novidadeLabels: Record<Novidade, string> = {
  novo: "Novo",
  "testado-agora": "Testado agora",
};

/**
 * Whole UTC days, so the weekly Atualização from 14 days back stays inside the
 * window however late either run started.
 */
function isWithinWindow(date: string | null | undefined, updatedAt: string): date is string {
  if (!date) return false;
  const ageDays = Math.floor(Date.parse(updatedAt) / dayMs) - Math.floor(Date.parse(date) / dayMs);
  return ageDays >= 0 && ageDays <= novidadeWindowDays;
}

/**
 * The latest of the two in the window; a Produto new and tested in one Atualização is "novo".
 * A Produto not tested yet has no Medições to show, so it waits for its test to be one.
 */
export function novidadeOf(product: Product, updatedAt: string): Novidade | undefined {
  if (!isTested(product)) return undefined;
  const { firstSeenAt, testedAt } = product;
  const isNew = isWithinWindow(firstSeenAt, updatedAt);
  if (isWithinWindow(testedAt, updatedAt)) {
    if (!isNew || Date.parse(testedAt) > Date.parse(firstSeenAt)) return "testado-agora";
  }
  return isNew ? "novo" : undefined;
}

export function filterNovidades(products: Product[], updatedAt: string): Product[] {
  return products.filter((product) => novidadeOf(product, updatedAt) !== undefined);
}

export type NovidadeCounts = { novos: number; testados: number };

/**
 * The Novidades dated after `lastSeenAt`, the Atualização the last visit showed:
 * a tested Produto first seen since then is new, else one tested since then is tested.
 */
export function countNovidadesSince(
  products: Product[],
  updatedAt: string,
  lastSeenAt: string,
): NovidadeCounts {
  const lastSeenMs = Date.parse(lastSeenAt);
  const isSinceLastVisit = (date: string | null | undefined) =>
    isWithinWindow(date, updatedAt) && Date.parse(date) > lastSeenMs;
  const counts: NovidadeCounts = { novos: 0, testados: 0 };
  for (const product of products) {
    if (!isTested(product)) continue;
    if (isSinceLastVisit(product.firstSeenAt)) counts.novos++;
    else if (isSinceLastVisit(product.testedAt)) counts.testados++;
  }
  return counts;
}
