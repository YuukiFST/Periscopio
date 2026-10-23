import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { z } from "zod";
import { isCategorySlug } from "@/categories";
import { ComparisonSkeleton } from "@/components/loading-skeletons";
import { loadCategoryData } from "@/data/load-data";
import { compareParamSchema, productIdsFromParam } from "@/product-compare/compare-selection";
import { connectionPreferenceSchema } from "@/product-compare/mouse-connection";
import { ProductComparison } from "@/product-compare/product-comparison";

const comparisonSearchSchema = z.object({
  p: compareParamSchema,
  conexao: connectionPreferenceSchema,
});

/**
 * `/comparar/<categoria>?p=<id>,<id>`: 2 to 4 Produtos of the Categoria side
 * by side; `conexao=com-fio` or `sem-fio` ranks mouses on that connection.
 */
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
  const { p } = Route.useSearch();
  const { categoria } = Route.useParams();
  return (
    <ComparisonSkeleton
      status="Carregando comparação…"
      linkedCount={productIdsFromParam(p).length}
      withConnectionRow={categoria === "mouse"}
    />
  );
}

function ComparisonPage() {
  const data = Route.useLoaderData();
  const { p, conexao } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProductComparison
      data={data}
      productParam={p}
      onProductParamChange={(nextParam) =>
        void navigate({ search: (search) => ({ ...search, p: nextParam }), replace: true })
      }
      connectionPreference={conexao}
      onConnectionPreferenceChange={(preference) =>
        void navigate({ search: (search) => ({ ...search, conexao: preference }), replace: true })
      }
    />
  );
}
