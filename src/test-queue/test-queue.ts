import { categorySlugs, type CategorySlug } from "../categories.ts";
import type { CategoryData, Product } from "../data/schema.ts";
import type { RecentProductItem } from "../recent-products/recent-products.ts";

/**
 * The Fila de testes' stages, in the Fonte's order: bought, then in the lab,
 * then shown early to its members. A suggested or unreleased Produto is not
 * in the queue yet, and a reviewed one has left it.
 */
export const testQueueStages = [
  { slug: "comprados", title: "Comprados", shortTitle: "Comprados", statuses: ["purchased"] },
  {
    slug: "em-teste",
    title: "Recebidos e em teste",
    shortTitle: "Em teste",
    statuses: ["arrived", "testing"],
  },
  { slug: "previa", title: "Em prévia", shortTitle: "Em prévia", statuses: ["earlyAccess"] },
] as const satisfies readonly {
  slug: string;
  title: string;
  /** Fits the phone's stage picker, three across at 320px. */
  shortTitle: string;
  statuses: readonly string[];
}[];

export type TestQueueStage = (typeof testQueueStages)[number];

const queuedStatuses: ReadonlySet<string> = new Set(
  testQueueStages.flatMap((stage) => stage.statuses),
);

export function isInTestQueue(product: Pick<Product, "status">): boolean {
  return product.status !== null && queuedStatuses.has(product.status);
}

const nameCollator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

/** A stage's Produtos of one Categoria, by name; never empty. */
export type TestQueueGroup = { category: CategorySlug; items: RecentProductItem[] };

/** A stage's Produtos, one group per Categoria that has any, in the app's order. */
export function testQueueGroups(
  categories: readonly CategoryData[],
  stage: TestQueueStage,
  onlyCategory: CategorySlug | undefined,
): TestQueueGroup[] {
  const statuses: ReadonlySet<string> = new Set(stage.statuses);
  return categorySlugs
    .filter((slug) => onlyCategory === undefined || slug === onlyCategory)
    .map((slug) => {
      const products = categories.find(({ category }) => category === slug)?.products ?? [];
      const items = products
        .filter((product) => product.status !== null && statuses.has(product.status))
        .toSorted((a, b) => nameCollator.compare(a.name, b.name))
        .map((product) => ({ category: slug, product }));
      return { category: slug, items };
    })
    .filter((group) => group.items.length > 0);
}

export function testQueueCount(products: readonly Product[]): number {
  return products.filter(isInTestQueue).length;
}
