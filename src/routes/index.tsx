import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { categoryLabels, categorySlugs, type CategorySlug } from "@/categories";
import { StaleDataAlert, UpdatedAtLabel, updateAgeOf } from "@/components/update-notice";
import { useAllCategories } from "@/data/use-all-categories";
import { ProductPhoto } from "@/product-photo/product-photo";
import { formatPrice, priceOf } from "@/product-table/cell-values";
import { filterNovidades } from "@/product-table/novidades";
import { resultCountText } from "@/product-table/table-toolbar";
import {
  recentProductItems,
  useRecentProducts,
  type RecentProductItem,
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
  const recent = useRecentProducts();
  // The Produtos feed only the Novidades and the recent list; the cards show without them.
  const [load, ensureLoaded] = useAllCategories();
  // `ensureLoaded` changes on every render; the page asks for the Produtos once.
  const loadStarted = useRef(false);
  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    ensureLoaded();
  }, [ensureLoaded]);

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
  const recentItems =
    load.status === "loaded"
      ? recentProductItems(recent, load.categories).slice(0, homeRecentProductCount)
      : [];

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
                productCount={meta.counts[slug]}
                novidadeCount={novidadeCounts?.get(slug)}
              />
            ))}
          </ul>
        </section>
        {recentItems.length > 0 && <RecentProductsSection items={recentItems} />}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  productCount,
  novidadeCount,
}: {
  category: CategorySlug;
  productCount: number;
  /** Undefined until the Categoria's Produtos load. */
  novidadeCount: number | undefined;
}) {
  return (
    <li className="relative flex flex-col gap-1 rounded-lg border border-border p-4 has-[a:hover]:bg-component-hover">
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
      {/* The Novidades join the count's line once the Produtos load, so the card keeps its height. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
        <p className="text-fg-secondary tabular-nums">
          {resultCountText(productCount, productCount)}
        </p>
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

function RecentProductsSection({ items }: { items: RecentProductItem[] }) {
  return (
    <section aria-labelledby="recentes-titulo" className="flex flex-col gap-3">
      <h2 id="recentes-titulo" className="font-serif text-heading-6 font-medium">
        Vistos recentemente
      </h2>
      <ul className="-mx-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {items.map(({ category, product }) => {
          const price = priceOf(product);
          return (
            <li key={`${category}/${product.id}`}>
              <Link
                to="/$categoria/$id"
                params={{ categoria: category, id: product.id }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm hover:bg-component-hover focus-visible:bg-component-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-component-active"
              >
                <ProductPhoto
                  key={product.image}
                  src={product.image}
                  alt=""
                  size="row"
                  loading="lazy"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{product.name}</span>
                  <span className="text-fg-secondary">{categoryLabels[category]}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap tabular-nums text-fg-secondary">
                  {price === undefined ? "Sem preço" : formatPrice(price)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
