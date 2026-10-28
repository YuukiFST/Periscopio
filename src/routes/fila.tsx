import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { categoryLabels, categorySlugs, type CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { useAllCategories } from "@/data/use-all-categories";
import { productCount } from "@/product-table/table-toolbar";
import { ProductList } from "@/recent-products/product-list";
import { testQueueCount, testQueueItems, testQueueStages } from "@/test-queue/test-queue";

const testQueueSearchSchema = z.object({
  categoria: z.enum(categorySlugs).optional().catch(undefined),
});

/**
 * `/fila?categoria=mouse`: the Fila de testes, the Produtos the Fonte bought
 * or is testing, by stage, from every Categoria or from one.
 */
export const Route = createFileRoute("/fila")({
  validateSearch: (search: Record<string, unknown>) => testQueueSearchSchema.parse(search),
  component: TestQueuePage,
});

const countFormat = new Intl.NumberFormat("pt-BR");

function TestQueuePage() {
  const { categoria } = Route.useSearch();
  const [load, ensureLoaded] = useAllCategories();
  useEffect(() => ensureLoaded(), [ensureLoaded]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = "Fila de testes · Periscópio";
    // A new view in a single-page app: the keyboard starts from its title.
    headingRef.current?.focus();
  }, []);

  const queueCounts =
    load.status === "loaded"
      ? new Map(
          load.categories.map(({ category, products }) => [category, testQueueCount(products)]),
        )
      : undefined;

  return (
    <div className="-mx-4 -my-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 ref={headingRef} tabIndex={-1} className="text-display outline-none">
            Fila de testes
          </h1>
          <p className="text-muted-foreground">
            Produtos que a Fonte já comprou ou está testando. As medições aparecem na Categoria
            quando o teste sai.
          </p>
        </div>
        <nav aria-label="Categorias da fila" className="-mx-2.5 flex flex-wrap gap-1">
          <QueueCategoryLink category={undefined} queueCounts={queueCounts} />
          {categorySlugs.map((slug) => (
            <QueueCategoryLink
              key={slug}
              category={slug}

              queueCounts={queueCounts}
            />
          ))}
        </nav>
        {/* Mounted all along, so a screen reader hears the loading end either way. */}
        <div role="status" className="empty:hidden">
          {load.status === "loading" && (
            <p className="text-body text-muted-foreground">Carregando produtos…</p>
          )}
          {load.status === "failed" && (
            <p className="text-body text-muted-foreground">
              Não deu para carregar os produtos. Verifique a conexão e tente de novo.
            </p>
          )}
        </div>
        {load.status === "failed" && (
          <Button
            variant="tertiary"
            className="self-start"
            onClick={() => {
              // The button goes while the Produtos load; focus moves on to the page's title.
              headingRef.current?.focus();
              ensureLoaded();
            }}
          >
            Tentar de novo
          </Button>
        )}
        {load.status === "loaded" && (
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-3 lg:items-start">
            {testQueueStages.map((stage) => {
              const items = testQueueItems(load.categories, stage, categoria);
              const headingId = `fila-${stage.slug}-titulo`;
              return (
                <section
                  key={stage.slug}
                  aria-labelledby={headingId}
                  className="flex flex-col gap-3"
                >
                  <h2 id={headingId} className="flex items-baseline gap-2 text-title font-medium">
                    {stage.title}
                    <span className="text-body font-normal text-muted-foreground tabular-nums">
                      {productCount(items.length)}
                    </span>
                  </h2>
                  {items.length > 0 ? (
                    <ProductList items={items} />
                  ) : (
                    <p className="text-body text-muted-foreground">Nenhum produto nesta etapa.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** One Categoria of the queue, or all of them; the counts show once the Produtos load. */
function QueueCategoryLink({
  category,
  queueCounts,
}: {
  category: CategorySlug | undefined;
  queueCounts: ReadonlyMap<CategorySlug, number> | undefined;
}) {
  const count =
    queueCounts === undefined
      ? undefined
      : category === undefined
        ? [...queueCounts.values()].reduce((sum, value) => sum + value, 0)
        : queueCounts.get(category);
  return (
    <Link
      to="/fila"
      search={category === undefined ? {} : { categoria: category }}
      // Exact, so "Todas" is not active under a Categoria; the active link gets aria-current="page".
      activeOptions={{ exact: true, includeSearch: true }}
      className="relative shrink-0 rounded-lg px-2.5 py-1 text-body font-medium pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 text-muted-foreground underline-offset-4 hover:bg-hover hover:text-foreground active:bg-active data-[status=active]:bg-active data-[status=active]:text-foreground data-[status=active]:underline"
    >
      {category === undefined ? "Todas" : categoryLabels[category]}
      {count !== undefined && " "}
      {count !== undefined && (
        <span className="ms-1 font-normal tabular-nums">{countFormat.format(count)}</span>
      )}
    </Link>
  );
}
