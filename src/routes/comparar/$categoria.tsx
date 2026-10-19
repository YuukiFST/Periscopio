import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { z } from "zod";
import { isCategorySlug } from "@/categories";
import { loadCategoryData } from "@/data/load-data";
import { compareParamSchema } from "@/product-compare/compare-selection";
import { ProductComparison } from "@/product-compare/product-comparison";

const comparisonSearchSchema = z.object({ p: compareParamSchema });

/** `/comparar/<categoria>?p=<id>,<id>`: 2 to 4 Produtos of the Categoria side by side. */
export const Route = createFileRoute("/comparar/$categoria")({
  validateSearch: (search: Record<string, unknown>) => comparisonSearchSchema.parse(search),
  beforeLoad: ({ params }) => {
    if (!isCategorySlug(params.categoria)) throw notFound({ routeId: rootRouteId });
    return { categorySlug: params.categoria };
  },
  loader: ({ context }) => loadCategoryData(context.categorySlug),
  pendingComponent: ComparisonPending,
  component: ComparisonPage,
});

function ComparisonPending() {
  return (
    <p role="status" className="text-fg-secondary">
      Carregando comparação…
    </p>
  );
}

function ComparisonPage() {
  const data = Route.useLoaderData();
  const { p } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProductComparison
      data={data}
      productParam={p}
      onProductParamChange={(nextParam) =>
        void navigate({ search: { p: nextParam }, replace: true })
      }
    />
  );
}
