import { Popover } from "@base-ui/react/popover";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import {
  Cuboid,
  FlaskConical,
  Headphones,
  Keyboard,
  Monitor,
  Mouse,
  RectangleHorizontal,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { categoryLabels, categorySlugs, type CategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { UpdatedAtLabel } from "@/components/update-notice";
import { isTested, type Product } from "@/data/schema";
import { useAllCategories, type CategoriesLoad } from "@/data/use-all-categories";
import { ProductPhoto } from "@/product-photo/product-photo";
import { useFavoriteIds } from "@/product-table/favorite-products";
import { filterNovidades } from "@/product-table/novidades";
import { productCount } from "@/product-table/table-toolbar";
import { testQueueCount } from "@/test-queue/test-queue";
import { ProductList } from "@/recent-products/product-list";
import { recentProductsPopover } from "@/recent-products/recent-products-button";
import {
  recentProductItems,
  useRecentProducts,
  type RecentProductItem,
} from "@/recent-products/recent-products";

/**
 * The home page: one card per Categoria with its Novidades and Favoritos, and
 * under the cards the Produtos seen last and the ones starred.
 */
export const Route = createFileRoute("/")({
  component: HomePage,
});

const rootRoute = getRouteApi("__root__");

/** The newest few; the header's Recentes list keeps the rest. */
const homeRecentProductCount = 6;
/** As many Favoritos as recent Produtos, so the two lists stand level. */
const homeFavoriteProductCount = 6;

/** Photos of a Categoria's tested Produtos on its card. */
const cardPhotoCount = 3;

const countFormat = new Intl.NumberFormat("pt-BR");

/**
 * Each Categoria's icon and hue on its card. Full class strings, so Tailwind
 * finds them; the hues are the `--color-categoria-*` tokens. The fill is fainter
 * in the light theme, so the gray count on it keeps 4.5:1.
 */
const categoryLooks: Record<CategorySlug, { icon: LucideIcon; fill: string; watermark: string }> = {
  mouse: {
    icon: Mouse,
    fill: "border-categoria-mouse/30 from-categoria-mouse/15 to-categoria-mouse/5 dark:from-categoria-mouse/25",
    watermark: "text-categoria-mouse/25",
  },
  teclado: {
    icon: Keyboard,
    fill: "border-categoria-teclado/30 from-categoria-teclado/15 to-categoria-teclado/5 dark:from-categoria-teclado/25",
    watermark: "text-categoria-teclado/25",
  },
  monitor: {
    icon: Monitor,
    fill: "border-categoria-monitor/30 from-categoria-monitor/15 to-categoria-monitor/5 dark:from-categoria-monitor/25",
    watermark: "text-categoria-monitor/25",
  },
  mousepad: {
    icon: RectangleHorizontal,
    fill: "border-categoria-mousepad/30 from-categoria-mousepad/15 to-categoria-mousepad/5 dark:from-categoria-mousepad/25",
    watermark: "text-categoria-mousepad/25",
  },
  switch: {
    icon: Cuboid,
    fill: "border-categoria-switch/30 from-categoria-switch/15 to-categoria-switch/5 dark:from-categoria-switch/25",
    watermark: "text-categoria-switch/25",
  },
  fone: {
    icon: Headphones,
    fill: "border-categoria-fone/30 from-categoria-fone/15 to-categoria-fone/5 dark:from-categoria-fone/25",
    watermark: "text-categoria-fone/25",
  },
};

/** The first few tested Produtos that have a photo. */
function cardPhotos(products: readonly Product[]): string[] {
  return products
    .flatMap((product) => (isTested(product) && product.image !== null ? [product.image] : []))
    .slice(0, cardPhotoCount);
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

  const recentItems = load.status === "loaded" ? recentProductItems(recent, load.categories) : [];
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
        <section aria-labelledby="categorias-titulo" className="flex min-w-0 flex-col gap-3">
          <h2 id="categorias-titulo" className="text-title font-medium">
            Categorias
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  photos={products ? cardPhotos(products) : []}
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
                  load.categories.reduce((sum, { products }) => sum + testQueueCount(products), 0),
                )}
              </span>
            )}
          </Link>
        </section>
        {hasLists && (
          // Capped, so a price stays near its name even when one list stands alone.
          <div className="grid gap-8 md:max-w-4xl md:grid-cols-2 md:items-start md:gap-x-10">
            {recent.length > 0 && (
              <ProductListSection id="recentes-titulo" title="Vistos recentemente">
                <LoadedProductList
                  load={load}
                  onRetry={ensureLoaded}
                  items={() => recentItems.slice(0, homeRecentProductCount)}
                  emptyText="Os produtos que você viu não estão mais nos dados. Os próximos que você abrir aparecem aqui."
                />
                {recentItems.length > homeRecentProductCount && (
                  // Opens the header's Recentes list, which holds the rest, under this button.
                  <Popover.Trigger
                    handle={recentProductsPopover}
                    render={<Button variant="tertiary" className="self-start" />}
                  >
                    Ver todos os {countFormat.format(recentItems.length)}
                  </Popover.Trigger>
                )}
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
  );
}

function CategoryCard({
  category,
  count,
  novidadeCount,
  favoriteCount,
  photos,
}: {
  category: CategorySlug;
  /** From `meta.counts`, so it shows before the Produtos load. */
  count: number;
  /** Undefined until the Categoria's Produtos load. */
  novidadeCount: number | undefined;
  /** The starred Produtos the data has; undefined until they load. */
  favoriteCount: number | undefined;
  /** Empty until the Categoria's Produtos load. */
  photos: readonly string[];
}) {
  const look = categoryLooks[category];
  const hasNovidades = novidadeCount !== undefined && novidadeCount > 0;
  const hasFavorites = favoriteCount !== undefined && favoriteCount > 0;
  return (
    <li
      className={`relative isolate flex items-center gap-4 overflow-hidden rounded-xl border bg-linear-to-br p-4 transition-[filter] [@media(hover:hover)]:has-[h3_a:hover]:brightness-125 has-[h3_a:active]:brightness-110 ${look.fill}`}
    >
      <look.icon
        aria-hidden="true"
        strokeWidth={1.5}
        className={`absolute start-1/3 -bottom-8 -z-10 size-32 -rotate-12 ${look.watermark}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-title font-medium">
          {/* The whole card opens the Categoria; the links below sit above it. */}
          <Link
            to="/$categoria"
            params={{ categoria: category }}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ring"
          >
            {categoryLabels[category]}
          </Link>
        </h3>
        {/* On touch the gap clears the links' larger tap areas, so wrapped rows never overlap. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pointer-coarse:gap-y-5">
          <p className="text-muted-foreground tabular-nums">{productCount(count)}</p>
          {hasNovidades && (
            <CardLink
              category={category}
              search={{ novidades: "1" }}
              icon={<Sparkles aria-hidden="true" className="size-4 shrink-0 text-novidade" />}
              count={novidadeCount}
              noun={novidadeCount === 1 ? "novidade" : "novidades"}
            />
          )}
          {hasFavorites && (
            <CardLink
              category={category}
              // A Favorito may be untested, so every Status de teste shows.
              search={{ favoritos: "1", status: "todos" }}
              icon={
                <Star aria-hidden="true" className="size-4 shrink-0 fill-current text-favorito" />
              }
              count={favoriteCount}
              noun={favoriteCount === 1 ? "favorito" : "favoritos"}
            />
          )}
        </div>
      </div>
      {photos.length > 0 && (
        <div className="flex shrink-0 -space-x-4">
          {photos.map((photo) => (
            <span key={photo} className="rounded-lg shadow-md ring-2 ring-background">
              <ProductPhoto src={photo} alt="" size="compare" loading="lazy" />
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * A link inside a Categoria card, above the card's own link so it opens its own view.
 * It shows the icon and the number; the noun is read out, not shown.
 */
function CardLink({
  category,
  search,
  icon,
  count,
  noun,
}: {
  category: CategorySlug;
  search: { novidades: "1" } | { favoritos: "1"; status: "todos" };
  icon: ReactNode;
  count: number;
  noun: string;
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
      {countFormat.format(count)}
      <span className="sr-only"> {noun}</span>
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
    // The first row's own padding completes the heading's gap, as on the Categoria cards.
    <section aria-labelledby={id} className="flex flex-col gap-1">
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
      <div role="status" className="py-2 empty:hidden">
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
