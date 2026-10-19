import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { z } from "zod";
import { isCategorySlug } from "@/categories";
import { loadCategoryData } from "@/data/load-data";
import {
  compareParamSchema,
  comparedIdsFromParam,
  productIdsParam,
} from "@/product-compare/compare-selection";
import { ProductDetail } from "@/product-detail/product-detail";
import { ProductNotFound } from "@/product-detail/product-not-found";

/** Only `cmp` is read here; the table's params pass through untouched. */
const detailSearchSchema = z.looseObject({ cmp: compareParamSchema });

/**
 * The detail URL keeps the table's search params as they were (Filtros,
 * ordem, busca), so the way back to the table reopens the same view.
 */
export const Route = createFileRoute("/$categoria/$id")({
  // Spread over the original, so the params keep the order the link has.
  validateSearch: (search: Record<string, unknown>) => ({
    ...search,
    ...detailSearchSchema.parse(search),
  }),
  beforeLoad: ({ params }) => {
    if (!isCategorySlug(params.categoria)) throw notFound({ routeId: rootRouteId });
    return { categorySlug: params.categoria };
  },
  loader: async ({ context, params }) => {
    const data = await loadCategoryData(context.categorySlug);
    const product = data.products.find((candidate) => candidate.id === params.id);
    if (!product) throw notFound();
    return { data, product };
  },
  pendingComponent: ProductPending,
  notFoundComponent: ProductNotFoundPage,
  component: ProductPage,
});

function ProductPending() {
  return (
    <p role="status" className="text-fg-secondary">
      Carregando produto…
    </p>
  );
}

function ProductNotFoundPage() {
  const { categorySlug } = Route.useRouteContext();
  return <ProductNotFound category={categorySlug} />;
}

function ProductPage() {
  const { data, product } = Route.useLoaderData();
  const { cmp } = Route.useSearch();
  const navigate = Route.useNavigate();
  const comparedIds = comparedIdsFromParam(
    cmp,
    new Set(data.products.map((candidate) => candidate.id)),
  );
  return (
    <ProductDetail
      data={data}
      product={product}
      comparedIds={comparedIds}
      onComparedIdsChange={(ids) =>
        void navigate({
          search: (previous) => ({ ...previous, cmp: productIdsParam(ids) }),
          replace: true,
        })
      }
    />
  );
}
