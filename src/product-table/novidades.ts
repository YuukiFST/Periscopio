import type { Product } from "../data/schema.ts";

const dayMs = 24 * 60 * 60 * 1000;
/** A Produto stays a Novidade for the 14 days before the Atualização. */
const novidadeWindowMs = 14 * dayMs;

export type Novidade = "novo" | "testado-agora";

export const novidadeLabels: Record<Novidade, string> = {
  novo: "Novo",
  "testado-agora": "Testado agora",
};

function isWithinWindow(date: string | null | undefined, updatedAt: string): boolean {
  if (!date) return false;
  const ageMs = Date.parse(updatedAt) - Date.parse(date);
  return ageMs >= 0 && ageMs <= novidadeWindowMs;
}

/** A Produto both new and tested in the window is only "novo". */
export function novidadeOf(product: Product, updatedAt: string): Novidade | undefined {
  if (isWithinWindow(product.firstSeenAt, updatedAt)) return "novo";
  if (isWithinWindow(product.testedAt, updatedAt)) return "testado-agora";
  return undefined;
}

export function filterNovidades(products: Product[], updatedAt: string): Product[] {
  return products.filter((product) => novidadeOf(product, updatedAt) !== undefined);
}

export type NovidadeCounts = { novos: number; testados: number };

/** The Novidades dated after `lastSeenAt`, the Atualização the last visit showed. */
export function countNovidadesSince(
  products: Product[],
  updatedAt: string,
  lastSeenAt: string,
): NovidadeCounts {
  const lastSeenMs = Date.parse(lastSeenAt);
  const counts: NovidadeCounts = { novos: 0, testados: 0 };
  for (const product of products) {
    const novidade = novidadeOf(product, updatedAt);
    if (novidade === undefined) continue;
    const date = novidade === "novo" ? product.firstSeenAt : product.testedAt;
    if (!date || Date.parse(date) <= lastSeenMs) continue;
    if (novidade === "novo") counts.novos++;
    else counts.testados++;
  }
  return counts;
}
