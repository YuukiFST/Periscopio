import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { z } from "zod";
import { isCategorySlug } from "@/categories";
import { ChartSkeleton } from "@/components/loading-skeletons";
import { loadCategoryData } from "@/data/load-data";
import { ProductChart } from "@/product-chart/product-chart";
import { validateTableSearch } from "@/product-table/table-search";

const axisSearchSchema = z.object({
  x: z.string().optional().catch(undefined),
  y: z.string().optional().catch(undefined),
});

/**
 * `/grafico/<categoria>?x=preco&y=nota`: the Gráfico, one dot per Produto on
 * two of the table's number columns, named by their slugs. Outside
 * `/$categoria/`, where `$id` would take `grafico` for a Produto. The table's
 * params ride along: the chart narrows the Produtos the same way, and its
 * links lead back to the table as it was left.
 */
export const Route = createFileRoute("/grafico/$categoria")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...validateTableSearch(search),
    ...axisSearchSchema.parse(search),
  }),
  beforeLoad: ({ params }) => {
    if (!isCategorySlug(params.categoria)) throw notFound({ routeId: rootRouteId });
    return { categorySlug: params.categoria };
  },
  loader: ({ context }) => loadCategoryData(context.categorySlug),
  pendingComponent: ChartPending,
  component: ChartPage,
});

function ChartPending() {
  return <ChartSkeleton status="Carregando gráfico…" />;
}

function ChartPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProductChart
      data={data}
      search={search}
      onAxisChange={(axis, slug) =>
        void navigate({ search: (previous) => ({ ...previous, [axis]: slug }), replace: true })
      }
    />
  );
}
