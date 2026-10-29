import { categorySlugs, type CategorySlug } from "../categories.ts";
import type { CategoryData, Product } from "../data/schema.ts";
import type { RecentProductItem } from "../recent-products/recent-products.ts";

/**
 * The Fila de testes' stages, in the Fonte's order: bought, then in the lab,
 * then shown early to its members. A suggested or unreleased Produto is not
 * in the queue yet, and a reviewed one has left it.
 */
export const testQueueStages = [
  { slug: "comprados", title: "Comprados", statuses: ["purchased"] },
  { slug: "em-teste", title: "Recebidos e em teste", statuses: ["arrived", "testing"] },
  { slug: "previa", title: "Em prévia", statuses: ["earlyAccess"] },
] as const satisfies readonly { slug: string; title: string; statuses: readonly string[] }[];

export type TestQueueStage = (typeof testQueueStages)[number];

const queuedStatuses: ReadonlySet<string> = new Set(
  testQueueStages.flatMap((stage) => stage.statuses),
);

export function isInTestQueue(product: Pick<Product, "status">): boolean {
  return product.status !== null && queuedStatuses.has(product.status);
}

const nameCollator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

/** A stage's Produtos, Categoria by Categoria in the app's order, then by name. */
export function testQueueItems(
  categories: readonly CategoryData[],
  stage: TestQueueStage,
  onlyCategory: CategorySlug | undefined,
): RecentProductItem[] {
  const statuses: ReadonlySet<string> = new Set(stage.statuses);
  return categorySlugs
    .filter((slug) => onlyCategory === undefined || slug === onlyCategory)
    .flatMap((slug) => {
      const products = categories.find(({ category }) => category === slug)?.products ?? [];
      return products
        .filter((product) => product.status !== null && statuses.has(product.status))
        .toSorted((a, b) => nameCollator.compare(a.name, b.name))
        .map((product) => ({ category: slug, product }));
    });
}

export function testQueueCount(products: readonly Product[]): number {
  return products.filter(isInTestQueue).length;
}
