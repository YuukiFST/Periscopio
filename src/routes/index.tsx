import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { categoryLabels, categorySlugs, type CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { StaleDataAlert, UpdatedAtLabel, updateAgeOf } from "@/components/update-notice";
import { useAllCategories, type CategoriesLoad } from "@/data/use-all-categories";
import { filterNovidades } from "@/product-table/novidades";
import { productCount } from "@/product-table/table-toolbar";
import { RecentProductLink } from "@/recent-products/recent-product-link";
import {
  recentProductItems,
  useRecentProducts,
  type RecentProduct,
} from "@/recent-products/recent-products";

/** The home page: one card per Categoria, its Novidades and the Produtos seen last. */
export const Route = createFileRoute("/")({
  component: HomePage,
});

const rootRoute = getRouteApi("__root__");

/** The newest few; the header's Recentes list keeps the rest. */
const homeRecentProductCount = 6;

const countFormat = new Intl.NumberFormat("pt-BR");

function novidadeCountText(count: number): string {
  return count === 1 ? "1 novidade" : `${countFormat.format(count)} novidades`;
}

function HomePage() {
  const meta = rootRoute.useLoaderData();
  // The Produtos feed only the Novidades and the recent list; the cards show without them.
  const [load, ensureLoaded] = useAllCategories();
  useEffect(() => ensureLoaded(), [ensureLoaded]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = "Periscópio";
    // A new view in a single-page app: the keyboard starts from its title.
    headingRef.current?.focus();
  }, []);
  const [openedAt] = useState(() => Date.now());
  const updateAge = updateAgeOf(meta, openedAt);

  const novidadeCounts =
    load.status === "loaded"
      ? new Map(
          load.categories.map(({ category, products }) => [
            category,
            filterNovidades(products, meta.updatedAt).length,
          ]),
        )
      : undefined;

  return (
    <div className="-mx-4 -my-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 ref={headingRef} tabIndex={-1} className="font-serif text-heading-5 outline-none">
              Periscópio
            </h1>
            {!updateAge.isStale && <UpdatedAtLabel age={updateAge} />}
          </div>
          {updateAge.isStale && <StaleDataAlert age={updateAge} />}
        </div>
        <section aria-labelledby="categorias-titulo" className="flex flex-col gap-3">
          <h2 id="categorias-titulo" className="font-serif text-heading-6 font-medium">
            Categorias
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {categorySlugs.map((slug) => (
              <CategoryCard
                key={slug}
                category={slug}
                count={meta.counts[slug]}
                novidadeCount={novidadeCounts?.get(slug)}
              />
            ))}
          </ul>
        </section>
        <RecentProductsSection load={load} onRetry={ensureLoaded} />
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  count,
  novidadeCount,
}: {
  category: CategorySlug;
  /** From `meta.counts`, so it shows before the Produtos load. */
  count: number;
  /** Undefined until the Categoria's Produtos load. */
  novidadeCount: number | undefined;
}) {
  return (
    <li className="relative flex flex-col gap-1 rounded-lg border border-border p-4 has-[h3_a:hover]:bg-component-hover">
      <h3 className="font-serif text-heading-6 font-medium">
        {/* The whole card opens the Categoria; the Novidades link sits above it. */}
        <Link
          to="/$categoria"
          params={{ categoria: category }}
          className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {categoryLabels[category]}
        </Link>
      </h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
        <p className="text-fg-secondary tabular-nums">{productCount(count)}</p>
        {novidadeCount !== undefined && novidadeCount > 0 && (
          <Link
            to="/$categoria"
            params={{ categoria: category }}
            // The Novidades include Produtos not tested yet, so every Status de teste shows.
            search={{ novidades: "1", status: "todos" }}
            className="relative z-10 inline-flex items-center gap-1 font-medium text-brand-fg tabular-nums underline-offset-4 hover:underline active:underline"
          >
            <Sparkles aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
            {novidadeCountText(novidadeCount)}
          </Link>
        )}
      </div>
    </li>
  );
}

/** Shown once a Produto has been opened, like the header's Recentes button. */
function RecentProductsSection({ load, onRetry }: { load: CategoriesLoad; onRetry: () => void }) {
  const recent = useRecentProducts();
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="recentes-titulo" className="flex flex-col gap-3">
      <h2 id="recentes-titulo" className="font-serif text-heading-6 font-medium">
        Vistos recentemente
      </h2>
      {load.status === "loading" && (
        <p className="text-body-sm text-fg-secondary">Carregando produtos…</p>
      )}
      {load.status === "failed" && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-sm text-fg-secondary">
            Não deu para carregar os produtos. Verifique a conexão e tente de novo.
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              // The button goes while the Produtos load; focus moves on to the page's title.
              document.querySelector<HTMLElement>("main h1")?.focus();
              onRetry();
            }}
          >
            Tentar de novo
          </Button>
        </div>
      )}
      {load.status === "loaded" && <RecentProductList recent={recent} load={load} />}
    </section>
  );
}

function RecentProductList({
  recent,
  load,
}: {
  recent: readonly RecentProduct[];
  load: Extract<CategoriesLoad, { status: "loaded" }>;
}) {
  const items = recentProductItems(recent, load.categories).slice(0, homeRecentProductCount);
  if (items.length === 0) {
    return (
      <p className="text-body-sm text-fg-secondary">Os produtos vistos não estão mais nos dados.</p>
    );
  }
  return (
    <ul className="-mx-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {items.map((item) => (
        <li key={`${item.category}/${item.product.id}`}>
          <RecentProductLink item={item} />
        </li>
      ))}
    </ul>
  );
}
