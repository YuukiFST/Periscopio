import {
  createFileRoute,
  getRouteApi,
  notFound,
  useMatch,
  useNavigate,
} from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { categoryLabels, isCategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { StaleDataAlert, UpdatedAtLabel, updateAgeOf } from "@/components/update-notice";
import { loadCategoryData } from "@/data/load-data";
import type { CategoryData } from "@/data/schema";
import { CompareBar } from "@/product-compare/compare-bar";
import {
  compareParamSchema,
  comparedIdsFromParam,
  toggleComparedId,
} from "@/product-compare/compare-selection";
import { ActiveFilterChips } from "@/product-filters/active-filter-chips";
import { categoryFiltersFor } from "@/product-filters/category-filters";
import { FilterDrawer } from "@/product-filters/filter-drawer";
import {
  activeFilterCount,
  applyFilters,
  noFilterValues,
  type FilterValues,
} from "@/product-filters/filter-engine";
import {
  filterSearchOf,
  filterValuesFromSearch,
  pickFilterSearch,
} from "@/product-filters/filter-link";
import { FilterPanel } from "@/product-filters/filter-panel";
import {
  defaultTestStatus,
  filterProducts,
  testStatusFilters,
  type TestStatusFilter,
} from "@/product-table/product-filter";
import { ProductSidebar } from "@/product-detail/product-sidebar";
import { useChangeComparedIds } from "@/product-detail/use-change-compared-ids";
import { ProductTable } from "@/product-table/product-table";
import { defaultSortFor, tableColumnsFor } from "@/product-table/table-columns";
import {
  sortParamAfterHeaderClick,
  sortingFromParam,
  sortParamPattern,
} from "@/product-table/table-sorting";
import {
  resultCountText,
  searchInputId,
  searchTextMaxLength,
  TableToolbar,
} from "@/product-table/table-toolbar";

/** Every param falls back to "absent" on its own, so a broken link still opens. */
const categorySearchSchema = z.object({
  ordem: z.string().regex(sortParamPattern).optional().catch(undefined),
  status: z.enum(testStatusFilters).optional().catch(undefined),
  q: z.string().max(searchTextMaxLength).optional().catch(undefined),
  cmp: compareParamSchema,
});

/**
 * The Categoria table, the layout under `/$categoria/$id` too: a Produto's
 * details open in a side panel over it, so the table stays as it was.
 */
export const Route = createFileRoute("/$categoria")({
  // Filtro params stay raw text here: only the Categoria's Filtros know which values are valid.
  validateSearch: (search: Record<string, unknown>) => ({
    ...categorySearchSchema.parse(search),
    ...pickFilterSearch(search),
  }),
  beforeLoad: ({ params }) => {
    if (!isCategorySlug(params.categoria)) throw notFound();
    return { categorySlug: params.categoria };
  },
  loader: ({ context }) => loadCategoryData(context.categorySlug),
  pendingComponent: CategoryPending,
  component: CategoryPage,
});

const rootRoute = getRouteApi("__root__");

function CategoryPending() {
  return (
    <p role="status" className="text-fg-secondary">
      Carregando produtos…
    </p>
  );
}

function CategoryPage() {
  const data = Route.useLoaderData();
  // A new Categoria starts with its own search box and a closed panel.
  return (
    <>
      <CategoryTable key={data.category} data={data} />
      <ProductSidebar key={`painel-${data.category}`} data={data} />
    </>
  );
}

const statusAdjective: Record<Exclude<TestStatusFilter, "todos">, string> = {
  testados: "testado",
  "nao-testados": "não testado",
};

function emptyResultText(
  searchText: string,
  status: TestStatusFilter,
  hasFilters: boolean,
): string {
  const kind = status === "todos" ? "Nenhum produto" : `Nenhum produto ${statusAdjective[status]}`;
  if (searchText && hasFilters) return `${kind} encontrado para “${searchText}” com esses filtros.`;
  if (searchText) return `${kind} encontrado para “${searchText}”.`;
  return hasFilters ? `${kind} com esses filtros.` : `${kind} nesta categoria.`;
}

const headingId = "categoria-titulo";
const filtersHeadingId = "filtros-titulo";

function CategoryTable({ data }: { data: CategoryData }) {
  const meta = rootRoute.useLoaderData();
  const search = Route.useSearch();
  const { ordem, q, cmp } = search;
  const status = search.status ?? defaultTestStatus;
  // Every call resolves from the current URL (`unsafeRelative: "path"`), not from this route,
  // so a change of Filtro, ordem or busca keeps a Produto's panel open.
  const navigate = useNavigate({ from: Route.fullPath });

  const productIds = useMemo(
    () => new Set(data.products.map((product) => product.id)),
    [data.products],
  );
  const comparedIds = useMemo(() => comparedIdsFromParam(cmp, productIds), [cmp, productIds]);
  const changeComparedIds = useChangeComparedIds(data.category);

  const filters = useMemo(() => categoryFiltersFor(data), [data]);
  const filterValues = useMemo(() => filterValuesFromSearch(filters, search), [filters, search]);
  const filterCount = activeFilterCount(filters, filterValues);
  const filterSearch = filterSearchOf(filters, filterValues);
  function changeFilterValues(values: FilterValues) {
    void navigate({
      unsafeRelative: "path",
      search: (previous) => ({ ...previous, ...filterSearchOf(filters, values) }),
      replace: true,
    });
  }
  const [clearCount, setClearCount] = useState(0);
  function clearFilters() {
    setClearCount((count) => count + 1);
    changeFilterValues(noFilterValues);
  }

  const columns = useMemo(() => tableColumnsFor(data), [data]);
  const defaultSort = defaultSortFor(data.category);
  const sorting = useMemo(() => {
    const sortable = new Set(columns.map((column) => column.slug));
    return sortingFromParam(ordem, sortable, defaultSort);
  }, [columns, ordem, defaultSort]);

  const [searchText, setSearchText] = useState(q ?? "");
  // The link changes `q` after each keystroke, a render later (the router commits in a
  // microtask); only a `q` other than the typed text, such as a link without it, replaces it.
  const [linkSearchText, setLinkSearchText] = useState(q);
  if (q !== linkSearchText) {
    setLinkSearchText(q);
    if ((q ?? "") !== searchText) setSearchText(q ?? "");
  }
  const deferredSearchText = useDeferredValue(searchText);
  const products = useMemo(
    () =>
      filterProducts(
        applyFilters(data.products, filters, filterValues),
        status,
        deferredSearchText,
      ),
    [data.products, filters, filterValues, status, deferredSearchText],
  );

  function changeSearchText(text: string) {
    setSearchText(text);
    void navigate({
      unsafeRelative: "path",
      search: (previous) => ({ ...previous, q: text || undefined }),
      replace: true,
    });
  }

  function showAllProducts() {
    setSearchText("");
    setClearCount((count) => count + 1);
    void navigate({
      unsafeRelative: "path",
      search: (previous) => ({
        ...previous,
        ...filterSearchOf(filters, noFilterValues),
        q: undefined,
        status: "todos",
      }),
      replace: true,
    });
    // The button goes away with the empty result; focus moves to the search it just cleared.
    document.getElementById(searchInputId)?.focus();
  }

  const categoryLabel = categoryLabels[data.category];
  // The open panel names the page after its Produto; closing it gives the title back.
  const isDetailOpen = useMatch({ from: "/$categoria/$id", shouldThrow: false }) !== undefined;
  useEffect(() => {
    if (!isDetailOpen) document.title = `${categoryLabel} · Periscópio`;
  }, [categoryLabel, isDetailOpen]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Read once: the table is keyed by Categoria, and closing the panel later must not move focus.
  const [openedWithDetail] = useState(isDetailOpen);
  useEffect(() => {
    // A new view in a single-page app: the keyboard starts from its title, unless the
    // Produto's panel opened with it and takes focus itself.
    if (!openedWithDetail) headingRef.current?.focus();
  }, [openedWithDetail]);
  const [openedAt] = useState(() => Date.now());
  const updateAge = updateAgeOf(meta, openedAt);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="font-serif text-heading-5 outline-none"
          >
            {categoryLabel}
          </h1>
          {!updateAge.isStale && <UpdatedAtLabel age={updateAge} />}
        </div>
        <CopyLinkButton />
      </div>
      {updateAge.isStale && <StaleDataAlert age={updateAge} />}
      <div className="flex min-h-0 flex-1 gap-6">
        <aside
          aria-labelledby={filtersHeadingId}
          className="scroll-fade-b relative -ms-2 hidden w-64 shrink-0 scroll-pt-12 flex-col gap-3 overflow-y-auto overscroll-contain ps-2 pe-2 pb-4 lg:flex xl:w-72"
        >
          <div className="sticky top-0 z-20 flex min-h-9 items-center justify-between gap-2 bg-page">
            <h2 id={filtersHeadingId} className="font-serif text-heading-6 font-medium">
              Filtros
            </h2>
            <Button
              variant="ghost"
              disabled={filterCount === 0}
              focusableWhenDisabled
              onClick={clearFilters}
              className="-me-2 pe-2"
            >
              Limpar
            </Button>
          </div>
          <FilterPanel
            category={data.category}
            filters={filters}
            values={filterValues}
            onValuesChange={changeFilterValues}
            clearCount={clearCount}
          />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TableToolbar
            searchText={searchText}
            onSearchTextChange={changeSearchText}
            testStatus={status}
            onTestStatusChange={(nextStatus) =>
              void navigate({
                unsafeRelative: "path",
                search: (previous) => ({
                  ...previous,
                  status: nextStatus === defaultTestStatus ? undefined : nextStatus,
                }),
                replace: true,
              })
            }
            countText={resultCountText(products.length, data.products.length)}
          >
            <FilterDrawer
              activeCount={filterCount}
              resultCount={products.length}
              onClear={clearFilters}
            >
              <FilterPanel
                category={data.category}
                filters={filters}
                values={filterValues}
                onValuesChange={changeFilterValues}
                clearCount={clearCount}
              />
            </FilterDrawer>
          </TableToolbar>
          <ActiveFilterChips
            filters={filters}
            values={filterValues}
            onValuesChange={changeFilterValues}
            focusAfterLastId={searchInputId}
          />
          {products.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-border px-4 py-6">
              <p className="font-medium wrap-anywhere">
                {emptyResultText(deferredSearchText.trim(), status, filterCount > 0)}
              </p>
              <Button variant="outline" size="lg" onClick={showAllProducts}>
                Mostrar todos os produtos
              </Button>
            </div>
          ) : (
            <ProductTable
              columns={columns}
              products={products}
              sorting={sorting}
              resultKey={[ordem, status, deferredSearchText, ...Object.values(filterSearch)].join(
                "|",
              )}
              labelledBy={headingId}
              comparedIds={comparedIds}
              onComparedToggle={(id) => changeComparedIds(toggleComparedId(comparedIds, id))}
              onSortClick={(slug) =>
                void navigate({
                  unsafeRelative: "path",
                  search: (previous) => ({
                    ...previous,
                    ordem: sortParamAfterHeaderClick(sorting, slug, defaultSort),
                  }),
                  replace: true,
                })
              }
            />
          )}
          {/* The side panel carries its own bar, over this one. On a short screen the table's
              floor pushes the bar below the fold, so it pins to the bottom edge. */}
          {!isDetailOpen && (
            <CompareBar
              className="sticky bottom-2 z-40 border-transparent shadow-large"
              category={data.category}
              comparedIds={comparedIds}
              onClear={() => changeComparedIds([])}
              focusAfterClearId={searchInputId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
