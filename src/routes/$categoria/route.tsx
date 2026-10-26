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
import { CategorySkeleton } from "@/components/loading-skeletons";
import {
  NovidadesNotice,
  StaleDataAlert,
  UpdatedAtLabel,
  updateAgeOf,
  useLastSeenUpdate,
} from "@/components/update-notice";
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
import { ChartLink } from "@/product-chart/chart-link";
import { countNovidadesSince, filterNovidades, novidadeOf } from "@/product-table/novidades";
import { ProductTable } from "@/product-table/product-table";
import { ColumnsMenu } from "@/product-table/columns-menu";
import { useStoredColumns } from "@/product-table/stored-columns";
import {
  columnKeysFromParam,
  columnsParamOf,
  defaultSortFor,
  tableColumnChoicesFor,
  tableColumnsFor,
} from "@/product-table/table-columns";
import {
  sortParamAfterHeaderClick,
  sortingFromParam,
  sortParamPattern,
} from "@/product-table/table-sorting";
import {
  novidadesToggleId,
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
  novidades: z.literal("1").optional().catch(undefined),
  // Unknown keys are dropped later, one by one, against the Categoria's fields.
  col: z.string().optional().catch(undefined),
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
  return <CategorySkeleton status="Carregando produtos…" />;
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
  const { ordem, q, cmp, novidades, col } = search;
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

  const columnChoices = useMemo(() => tableColumnChoicesFor(data), [data]);
  const [storedColumns, storeColumns] = useStoredColumns(data.category);
  const columnKeys = useMemo(
    () =>
      columnKeysFromParam(col, columnChoices.availableKeys) ??
      columnKeysFromParam(storedColumns, columnChoices.availableKeys) ??
      columnChoices.defaultKeys,
    [columnChoices, col, storedColumns],
  );
  const columns = useMemo(() => tableColumnsFor(data, columnKeys), [data, columnKeys]);
  function changeColumnKeys(keys: string[]) {
    const columnsParam = columnsParamOf(keys, columnChoices.defaultKeys);
    void navigate({
      unsafeRelative: "path",
      search: (previous) => ({ ...previous, col: columnsParam }),
      replace: true,
    });
    storeColumns(columnsParam);
  }
  const defaultSort = useMemo(() => defaultSortFor(data.category, columns), [data, columns]);
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
  const products = useMemo(() => {
    const filtered = filterProducts(
      applyFilters(data.products, filters, filterValues),
      status,
      deferredSearchText,
    );
    return novidades ? filterNovidades(filtered, meta.updatedAt) : filtered;
  }, [data.products, filters, filterValues, status, deferredSearchText, novidades, meta.updatedAt]);
  const hasNovidades = useMemo(
    () => data.products.some((product) => novidadeOf(product, meta.updatedAt) !== undefined),
    [data.products, meta.updatedAt],
  );
  const [lastSeenUpdate, markUpdateSeen] = useLastSeenUpdate(data.category, meta.updatedAt);
  const novidadeCounts = useMemo(
    () =>
      lastSeenUpdate === null
        ? undefined
        : countNovidadesSince(data.products, meta.updatedAt, lastSeenUpdate),
    [data.products, meta.updatedAt, lastSeenUpdate],
  );

  function changeNovidades(pressed: boolean) {
    void navigate({
      unsafeRelative: "path",
      search: (previous) => ({ ...previous, novidades: pressed ? "1" : undefined }),
      replace: true,
    });
  }

  function showNovidades() {
    markUpdateSeen();
    // The notice counts untested Produtos too, so every Status de teste shows.
    void navigate({
      unsafeRelative: "path",
      search: (previous) => ({ ...previous, novidades: "1", status: "todos" }),
      replace: true,
    });
    // The notice goes away; focus moves to the toggle it just turned on.
    document.getElementById(novidadesToggleId)?.focus();
  }

  function dismissNovidadesNotice() {
    markUpdateSeen();
    document.getElementById(searchInputId)?.focus();
  }

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
        novidades: undefined,
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
      {/* With the Novidades already shown, as from the home page's link, it has nothing to offer. */}
      {novidades !== "1" &&
        novidadeCounts !== undefined &&
        novidadeCounts.novos + novidadeCounts.testados > 0 && (
          <NovidadesNotice
            counts={novidadeCounts}
            onShow={showNovidades}
            onDismiss={dismissNovidadesNotice}
          />
        )}
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
            novidades={
              hasNovidades || novidades
                ? { pressed: novidades === "1", onPressedChange: changeNovidades }
                : undefined
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
            <ColumnsMenu
              groups={columnChoices.groups}
              chosenKeys={columnKeys}
              isDefault={columnsParamOf(columnKeys, columnChoices.defaultKeys) === undefined}
              onChosenKeysChange={changeColumnKeys}
              onReset={() => changeColumnKeys(columnChoices.defaultKeys)}
            />
            <ChartLink category={data.category} />
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
                {emptyResultText(
                  deferredSearchText.trim(),
                  status,
                  filterCount > 0 || novidades === "1",
                )}
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
              resultKey={[
                ordem,
                status,
                deferredSearchText,
                novidades,
                ...Object.values(filterSearch),
              ].join("|")}
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
