import { createFileRoute, getRouteApi, notFound, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { categoryLabels, isCategorySlug } from "@/categories";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { StaleDataAlert, UpdatedAtLabel, updateAgeOf } from "@/components/update-notice";
import { loadCategoryData } from "@/data/load-data";
import type { CategoryData } from "@/data/schema";
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
import { resultCountText, searchInputId, TableToolbar } from "@/product-table/table-toolbar";

/** Every param falls back to "absent" on its own, so a broken link still opens. */
const categorySearchSchema = z.object({
  ordem: z.string().regex(sortParamPattern).optional().catch(undefined),
  status: z.enum(testStatusFilters).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/$categoria/")({
  validateSearch: categorySearchSchema,
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

function emptyResultText(searchText: string, status: TestStatusFilter | undefined): string {
  const kind = status ? `Nenhum produto ${statusAdjective[status]}` : "Nenhum produto";
  return searchText ? `${kind} encontrado para “${searchText}”.` : `${kind} nesta categoria.`;
}

const headingId = "categoria-titulo";

function CategoryTable({ data }: { data: CategoryData }) {
  const meta = rootRoute.useLoaderData();
  const { ordem, status, q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const columns = useMemo(() => tableColumnsFor(data), [data]);
  const defaultSort = defaultSortFor(data.category);
  const sorting = useMemo(() => {
    const sortable = new Set(
      columns.flatMap((column) => (column.kind === "aliexpress" ? [] : [column.slug])),
    );
    return sortingFromParam(ordem, sortable, defaultSort);
  }, [columns, ordem, defaultSort]);

  const [searchText, setSearchText] = useState(q ?? "");
  const deferredSearchText = useDeferredValue(searchText);
  const products = useMemo(
    () => filterProducts(data.products, status, deferredSearchText),
    [data.products, status, deferredSearchText],
  );

  function changeSearchText(text: string) {
    setSearchText(text);
    void navigate({ search: (previous) => ({ ...previous, q: text || undefined }), replace: true });
  }

  function showAllProducts() {
    setSearchText("");
    void navigate({
      search: (previous) => ({ ...previous, q: undefined, status: undefined }),
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
      />
      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border px-4 py-6">
          <p className="font-medium wrap-anywhere">
            {emptyResultText(deferredSearchText.trim(), status)}
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
          resultKey={`${ordem}|${status}|${deferredSearchText}`}
          labelledBy={headingId}
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
    </div>
  );
}
