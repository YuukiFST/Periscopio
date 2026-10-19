import { createFileRoute, getRouteApi, notFound, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  productIdsParam,
  toggleComparedId,
} from "@/product-compare/compare-selection";
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
  filterProducts,
  testStatusFilters,
  type TestStatusFilter,
} from "@/product-table/product-filter";
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

export const Route = createFileRoute("/$categoria/")({
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
  // A new Categoria starts with its own search box.
  return <CategoryTable key={data.category} data={data} />;
}

const statusAdjective: Record<TestStatusFilter, string> = {
  testados: "testado",
  "nao-testados": "não testado",
};

function emptyResultText(
  searchText: string,
  status: TestStatusFilter | undefined,
  hasFilters: boolean,
): string {
  const kind = status ? `Nenhum produto ${statusAdjective[status]}` : "Nenhum produto";
  if (searchText && hasFilters) return `${kind} encontrado para “${searchText}” com esses filtros.`;
  if (searchText) return `${kind} encontrado para “${searchText}”.`;
  return hasFilters ? `${kind} com esses filtros.` : `${kind} nesta categoria.`;
}

const headingId = "categoria-titulo";
const filtersHeadingId = "filtros-titulo";

function CategoryTable({ data }: { data: CategoryData }) {
  const meta = rootRoute.useLoaderData();
  const search = Route.useSearch();
  const { ordem, status, q, cmp } = search;
  const navigate = useNavigate({ from: Route.fullPath });

  const productIds = useMemo(
    () => new Set(data.products.map((product) => product.id)),
    [data.products],
  );
  const comparedIds = useMemo(() => comparedIdsFromParam(cmp, productIds), [cmp, productIds]);
  function changeComparedIds(ids: readonly string[]) {
    void navigate({
      search: (previous) => ({ ...previous, cmp: productIdsParam(ids) }),
      replace: true,
    });
  }

  const filters = useMemo(() => categoryFiltersFor(data), [data]);
  const filterValues = useMemo(() => filterValuesFromSearch(filters, search), [filters, search]);
  const filterCount = activeFilterCount(filters, filterValues);
  const filterSearch = filterSearchOf(filters, filterValues);
  function changeFilterValues(values: FilterValues) {
    void navigate({
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
    const sortable = new Set(
      columns.flatMap((column) => (column.kind === "aliexpress" ? [] : [column.slug])),
    );
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
    void navigate({ search: (previous) => ({ ...previous, q: text || undefined }), replace: true });
  }

  function showAllProducts() {
    setSearchText("");
    setClearCount((count) => count + 1);
    void navigate({
      search: (previous) => ({
        ...previous,
        ...filterSearchOf(filters, noFilterValues),
        q: undefined,
        status: undefined,
      }),
      replace: true,
    });
    // The button goes away with the empty result; focus moves to the search it just cleared.
    document.getElementById(searchInputId)?.focus();
  }

  const categoryLabel = categoryLabels[data.category];
  useEffect(() => {
    document.title = `${categoryLabel} · EyeJoker`;
  }, [categoryLabel]);
  const [openedAt] = useState(() => Date.now());
  const updateAge = updateAgeOf(meta, openedAt);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 id={headingId} className="font-serif text-heading-5">
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
            <h2 id={filtersHeadingId} className="text-body-base font-medium">
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
                search: (previous) => ({ ...previous, status: nextStatus }),
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
                filters={filters}
                values={filterValues}
                onValuesChange={changeFilterValues}
                clearCount={clearCount}
              />
            </FilterDrawer>
          </TableToolbar>
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
                  search: (previous) => ({
                    ...previous,
                    ordem: sortParamAfterHeaderClick(sorting, slug, defaultSort),
                  }),
                  replace: true,
                })
              }
            />
          )}
          <CompareBar
            category={data.category}
            comparedIds={comparedIds}
            onClear={() => changeComparedIds([])}
            focusAfterClearId={searchInputId}
          />
        </div>
      </div>
    </div>
  );
}
