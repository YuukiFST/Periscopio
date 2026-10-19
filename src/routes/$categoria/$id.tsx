import {
  createFileRoute,
  notFound,
  rootRouteId,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
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
  const search = Route.useSearch();
  const params = Route.useParams();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const fromCategoryTable = useLocation({
    select: (location) => location.state.fromCategoryTable === true,
  });
  const comparedIds = comparedIdsFromParam(
    search.cmp,
    new Set(data.products.map((candidate) => candidate.id)),
  );
  // Opened from the table, the browser's back from here lands on the table with the old marks,
  // and the marks live only in the link: this entry becomes the table with the new marks and
  // the detail opens again above it, so back returns to the table as this screen left it.
  // Opened from anywhere else (the Comparação, a link), back keeps leading there.
  function changeComparedIds(ids: readonly string[]) {
    const nextSearch = { ...search, cmp: productIdsParam(ids) };
    if (!fromCategoryTable) {
      void navigate({ search: nextSearch, replace: true });
      return;
    }
    void navigate({
      to: "/$categoria",
      params: { categoria: params.categoria },
      search: nextSearch,
      replace: true,
    });
    // The browser history batches writes in a microtask; unflushed, the two become one push.
    router.history.flush();
    void navigate({
      to: "/$categoria/$id",
      params,
      search: nextSearch,
      state: { fromCategoryTable: true },
    });
  }
  return (
    <ProductDetail
      data={data}
      product={product}
      comparedIds={comparedIds}
      onComparedIdsChange={changeComparedIds}
    />
  );
}
