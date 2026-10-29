import { createFileRoute, Link, useMatch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { categoryLabels, categorySlugs, type CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAllCategories } from "@/data/use-all-categories";
import { productCount } from "@/product-table/table-toolbar";
import { ProductList } from "@/recent-products/product-list";
import {
  testQueueCount,
  testQueueGroups,
  testQueueStages,
  type TestQueueGroup,
  type TestQueueStage,
} from "@/test-queue/test-queue";
import { TestQueueProductPanel, testQueueHeadingId } from "@/test-queue/test-queue-panel";

const testQueueSearchSchema = z.object({
  categoria: z.enum(categorySlugs).optional().catch(undefined),
});

/**
 * `/fila?categoria=mouse`: the Fila de testes, the Produtos the Fonte bought
 * or is testing, by stage, from every Categoria or from one. The layout under
 * `/fila/$categoriaProduto/$id` too: a Produto's details open in a side panel over it.
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

  // On a phone one stage shows at a time; a wide screen shows all three side by side.
  const [phoneStage, setPhoneStage] = useState<TestQueueStage["slug"]>(testQueueStages[0].slug);

  // The open panel names the page after its Produto; closing it gives the title back.
  const isDetailOpen =
    useMatch({ from: "/fila/$categoriaProduto/$id", shouldThrow: false }) !== undefined;
  useEffect(() => {
    if (!isDetailOpen) document.title = "Fila de testes · Periscópio";
  }, [isDetailOpen]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Read once: closing the panel later must not move focus.
  const [openedWithDetail] = useState(isDetailOpen);
  useEffect(() => {
    // A new view in a single-page app: the keyboard starts from its title, unless the
    // Produto's panel opened with it and takes focus itself.
    if (!openedWithDetail) headingRef.current?.focus();
  }, [openedWithDetail]);

  const queueCounts =
    load.status === "loaded"
      ? new Map(
          load.categories.map(({ category, products }) => [category, testQueueCount(products)]),
        )
      : undefined;

  return (
    <div className="-mx-4 -my-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="flex w-full flex-col gap-6 lg:min-h-0 lg:flex-1">
        <div className="flex flex-col gap-1">
          <h1
            ref={headingRef}
            id={testQueueHeadingId}
            tabIndex={-1}
            className="text-display outline-none"
          >
            Fila de testes
          </h1>
          <p className="text-muted-foreground">
            Produtos que a Fonte já comprou ou está testando. As medições aparecem na Categoria
            quando o teste sai.
          </p>
        </div>
        <nav aria-label="Categorias da fila" className="-mx-2.5 flex flex-wrap gap-1">
          <QueueCategoryLink
            category={undefined}
            isCurrent={categoria === undefined}
            queueCounts={queueCounts}
          />
          {categorySlugs.map((slug) => (
            <QueueCategoryLink
              key={slug}
              category={slug}
              isCurrent={categoria === slug}
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
          <>
            <div className="lg:hidden">
              <SegmentedControl
                legend="Etapa da fila"
                name="fila-etapa"
                options={testQueueStages.map((stage) => ({
                  value: stage.slug,
                  label: stage.shortTitle,
                }))}
                value={phoneStage}
                onValueChange={setPhoneStage}
              />
            </div>
            {/* Wide, the page fits the screen and each stage scrolls on its own. */}
            <div className="grid gap-4 lg:min-h-96 lg:flex-1 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)]">
              {testQueueStages.map((stage) => (
                <TestQueueStageColumn
                  key={stage.slug}
                  stage={stage}
                  groups={testQueueGroups(load.categories, stage, categoria)}
                  showsCategoryHeadings={categoria === undefined}
                  isPhoneStage={stage.slug === phoneStage}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <TestQueueProductPanel categories={load.status === "loaded" ? load.categories : undefined} />
    </div>
  );
}

/** One stage's Produtos, under a heading per Categoria when every Categoria shows. */
function TestQueueStageColumn({
  stage,
  groups,
  showsCategoryHeadings,
  isPhoneStage,
}: {
  stage: TestQueueStage;
  groups: readonly TestQueueGroup[];
  showsCategoryHeadings: boolean;
  isPhoneStage: boolean;
}) {
  const headingId = `fila-${stage.slug}-titulo`;
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-h-0 flex-col lg:rounded-xl lg:border lg:border-border ${isPhoneStage ? "" : "max-lg:hidden"}`}
    >
      <h2
        id={headingId}
        className="flex items-baseline gap-2 pb-2 text-title font-medium lg:border-b lg:border-border lg:px-4 lg:py-3"
      >
        {stage.title}
        <span className="text-body font-normal text-muted-foreground tabular-nums">
          {productCount(count)}
        </span>
      </h2>
      <div className="lg:overflow-y-auto lg:px-4 lg:pb-3">
        {groups.length === 0 && (
          <p className="pt-3 text-body text-muted-foreground">Nenhum produto nesta etapa.</p>
        )}
        {groups.map((group) => (
          <div key={group.category}>
            {showsCategoryHeadings && (
              <h3 className="sticky top-0 z-10 flex items-baseline gap-2 bg-background pt-3 pb-1 text-body font-medium">
                {categoryLabels[group.category]}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {countFormat.format(group.items.length)}
                </span>
              </h3>
            )}
            <ProductList items={group.items} showsCategory={false} opensInTestQueue />
          </div>
        ))}
      </div>
    </section>
  );
}

/** One Categoria of the queue, or all of them; the counts show once the Produtos load. */
function QueueCategoryLink({
  category,
  isCurrent,
  queueCounts,
}: {
  category: CategorySlug | undefined;
  /** From the search, so it holds while a Produto's panel is open too. */
  isCurrent: boolean;
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
      // Exact, so "Todas" is not active under a Categoria; the current link gets aria-current="page"
      // under a Produto's panel too, where the router's own match no longer holds.
      activeOptions={{ exact: true, includeSearch: true }}
      aria-current={isCurrent ? "page" : undefined}
      data-status={isCurrent ? "active" : undefined}
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
