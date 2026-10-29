import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { FlaskConical, Sparkles, Star } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { categoryLabels, categorySlugs, type CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { UpdatedAtLabel } from "@/components/update-notice";
import { useAllCategories, type CategoriesLoad } from "@/data/use-all-categories";
import { useFavoriteIds } from "@/product-table/favorite-products";
import { filterNovidades } from "@/product-table/novidades";
import { productCount } from "@/product-table/table-toolbar";
import { testQueueCount } from "@/test-queue/test-queue";
import { ProductList } from "@/recent-products/product-list";
import {
  recentProductItems,
  useRecentProducts,
  type RecentProductItem,
} from "@/recent-products/recent-products";

/**
 * The home page: one card per Categoria with its Novidades and Favoritos, and
 * beside the cards the Produtos seen last and the ones starred.
 */
export const Route = createFileRoute("/")({
  component: HomePage,
});

const rootRoute = getRouteApi("__root__");

/** The newest few; the header's Recentes list keeps the rest. */
const homeRecentProductCount = 6;
/** As many Favoritos as recent Produtos, so the two lists stand level. */
const homeFavoriteProductCount = 6;

const countFormat = new Intl.NumberFormat("pt-BR");

function novidadeCountText(count: number): string {
  return count === 1 ? "1 novidade" : `${countFormat.format(count)} novidades`;
}

function favoriteCountText(count: number): string {
  return count === 1 ? "1 favorito" : `${countFormat.format(count)} favoritos`;
}

type LoadedCategories = Extract<CategoriesLoad, { status: "loaded" }>;

/** Each Categoria's stored Favorito ids; the hooks run in the fixed Categoria order. */
function useFavoriteIdsByCategory(): Record<CategorySlug, ReadonlySet<string>> {
  const [mouse] = useFavoriteIds("mouse");
  const [teclado] = useFavoriteIds("teclado");
  const [monitor] = useFavoriteIds("monitor");
  const [mousepad] = useFavoriteIds("mousepad");
  const [keyboardSwitch] = useFavoriteIds("switch");
  const [fone] = useFavoriteIds("fone");
  return { mouse, teclado, monitor, mousepad, switch: keyboardSwitch, fone };
}

/** The starred Produtos the data still has, Categoria by Categoria. */
function favoriteProductItems(
  favoriteIds: Record<CategorySlug, ReadonlySet<string>>,
  load: LoadedCategories,
): RecentProductItem[] {
  return load.categories.flatMap(({ category, products }) =>
    products
      .filter((product) => favoriteIds[category].has(product.id))
      .map((product) => ({ category, product })),
  );
}

function HomePage() {
  const meta = rootRoute.useLoaderData();
  // The Produtos feed only the Novidades and the lists; the cards show without them.
  const [load, ensureLoaded] = useAllCategories();
  useEffect(() => ensureLoaded(), [ensureLoaded]);
  const recent = useRecentProducts();
  const favoriteIds = useFavoriteIdsByCategory();

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = "Periscópio";
    // A new view in a single-page app: the keyboard starts from its title.
    headingRef.current?.focus();
  }, []);

  const favorites = load.status === "loaded" ? favoriteProductItems(favoriteIds, load) : [];
  const hasStoredFavorites = categorySlugs.some((slug) => favoriteIds[slug].size > 0);
  const hasLists = recent.length > 0 || hasStoredFavorites;

  return (
    <div className="-mx-4 -my-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h1 ref={headingRef} tabIndex={-1} className="text-display outline-none">
              Periscópio
            </h1>
            <p className="text-muted-foreground">
              Medições, especificações e preços de mouses, teclados, monitores, mousepads, switches
              e fones, em português.
            </p>
            <UpdatedAtLabel meta={meta} />
          </div>
        </div>
        {/* The lists sit beside the cards on a wide screen and under them on a phone. */}
        <div
          className={
            hasLists
              ? "grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start"
              : "flex flex-col"
          }
        >
          <section aria-labelledby="categorias-titulo" className="flex min-w-0 flex-col gap-3">
            <h2 id="categorias-titulo" className="text-title font-medium">
              Categorias
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {categorySlugs.map((slug) => {
                const categoryLoad = load.status === "loaded" ? load : undefined;
                const products = categoryLoad?.categories.find(
                  ({ category }) => category === slug,
                )?.products;
                return (
                  <CategoryCard
                    key={slug}
                    category={slug}
                    count={meta.counts[slug]}
                    novidadeCount={products && filterNovidades(products, meta.updatedAt).length}
                    favoriteCount={
                      products?.filter((product) => favoriteIds[slug].has(product.id)).length
                    }
                  />
                );
              })}
            </ul>
            <Link
              to="/fila"
              className="inline-flex items-center gap-2 self-start font-medium tabular-nums underline-offset-4 hover:underline active:underline"
            >
              <FlaskConical aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              Fila de testes
              {load.status === "loaded" && (
                <span className="font-normal text-muted-foreground">
                  {productCount(
                    load.categories.reduce(
                      (sum, { products }) => sum + testQueueCount(products),
                      0,
                    ),
                  )}
                </span>
              )}
            </Link>
          </section>
          {hasLists && (
            // Between a phone and a wide screen the lists sit side by side, so a price stays near its name.
            <div className="flex min-w-0 flex-col gap-8 sm:grid sm:grid-cols-2 sm:gap-x-10 lg:flex">
              {recent.length > 0 && (
                <ProductListSection id="recentes-titulo" title="Vistos recentemente">
                  <LoadedProductList
                    load={load}
                    onRetry={ensureLoaded}
                    items={(loaded) =>
                      recentProductItems(recent, loaded.categories).slice(0, homeRecentProductCount)
                    }
                    emptyText="Os produtos que você viu não estão mais nos dados."
                  />
                </ProductListSection>
              )}
              {hasStoredFavorites && (
                <ProductListSection id="favoritos-titulo" title="Favoritos">
                  <LoadedProductList
                    load={load}
                    onRetry={ensureLoaded}
                    items={() => favorites.slice(0, homeFavoriteProductCount)}
                    emptyText="Os produtos favoritos não estão mais nos dados."
                  />
                </ProductListSection>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  count,
  novidadeCount,
  favoriteCount,
}: {
  category: CategorySlug;
  /** From `meta.counts`, so it shows before the Produtos load. */
  count: number;
  /** Undefined until the Categoria's Produtos load. */
  novidadeCount: number | undefined;
  /** The starred Produtos the data has; undefined until they load. */
  favoriteCount: number | undefined;
}) {
  const hasNovidades = novidadeCount !== undefined && novidadeCount > 0;
  const hasFavorites = favoriteCount !== undefined && favoriteCount > 0;
  return (
    <li className="relative flex flex-col gap-1 rounded-xl sm:min-h-28 border border-border p-4 [@media(hover:hover)]:has-[h3_a:hover]:bg-hover has-[h3_a:active]:bg-active">
      <h3 className="text-subtitle font-medium">
        {/* The whole card opens the Categoria; the links below sit above it. */}
        <Link
          to="/$categoria"
          params={{ categoria: category }}
          className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {categoryLabels[category]}
        </Link>
      </h3>
      <p className="text-muted-foreground tabular-nums">{productCount(count)}</p>
      {(hasNovidades || hasFavorites) && (
        // On touch the gap clears the links' larger tap areas, so wrapped rows never overlap.
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 pointer-coarse:gap-y-5">
          {hasNovidades && (
            <CardLink
              category={category}
              // The Novidades include Produtos not tested yet, so every Status de teste shows.
              search={{ novidades: "1", status: "todos" }}
              icon={<Sparkles aria-hidden="true" className="size-4 shrink-0 text-novidade" />}
            >
              {novidadeCountText(novidadeCount)}
            </CardLink>
          )}
          {hasFavorites && (
            <CardLink
              category={category}
              // A Favorito may be untested, so every Status de teste shows.
              search={{ favoritos: "1", status: "todos" }}
              icon={
                <Star aria-hidden="true" className="size-4 shrink-0 fill-current text-favorito" />
              }
            >
              {favoriteCountText(favoriteCount)}
            </CardLink>
          )}
        </div>
      )}
    </li>
  );
}

/** A link inside a Categoria card, above the card's own link so it opens its own view. */
function CardLink({
  category,
  search,
  icon,
  children,
}: {
  category: CategorySlug;
  search: { novidades?: "1"; favoritos?: "1"; status: "todos" };
  icon: ReactNode;
  children: string;
}) {
  return (
    <Link
      to="/$categoria"
      params={{ categoria: category }}
      search={search}
      // The touch target grows past the 20px text, so a tap just off it opens this view, not the card's.
      className={`relative z-10 inline-flex items-center gap-1 font-medium tabular-nums underline-offset-4 hover:underline active:underline pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-2.5`}
    >
      {icon}
      {children}
      {/* Every card has these links, so the name says which Categoria each opens. */}
      <span className="sr-only"> em {categoryLabels[category]}</span>
    </Link>
  );
}

function ProductListSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-title font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A list of Produtos once the Categorias load, with the loading and failure in its place. */
function LoadedProductList({
  load,
  onRetry,
  items,
  emptyText,
}: {
  load: CategoriesLoad;
  onRetry: () => void;
  items: (loaded: LoadedCategories) => RecentProductItem[];
  emptyText: string;
}) {
  const shown = load.status === "loaded" ? items(load) : [];
  return (
    <>
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
        {load.status === "loaded" && shown.length === 0 && (
          <p className="text-body text-muted-foreground">{emptyText}</p>
        )}
      </div>
      {load.status === "failed" && (
        <Button
          variant="tertiary"
          className="self-start"
          onClick={() => {
            // The button goes while the Produtos load; focus moves on to the page's title.
            document.querySelector<HTMLElement>("main h1")?.focus();
            onRetry();
          }}
        >
          Tentar de novo
        </Button>
      )}
      {shown.length > 0 && <ProductList items={shown} />}
    </>
  );
}
