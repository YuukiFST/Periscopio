import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { z } from "zod";
import { isCategorySlug } from "@/categories";
import { loadCategoryData } from "@/data/load-data";
import { compareParamSchema } from "@/product-compare/compare-selection";
import { ProductChart } from "@/product-chart/product-chart";
import { pickFilterSearch } from "@/product-filters/filter-link";
import { testStatusFilters } from "@/product-table/product-filter";
import { sortParamPattern } from "@/product-table/table-sorting";
import { searchTextMaxLength } from "@/product-table/table-toolbar";

/**
 * The table's params, as `/$categoria` reads them, ride along: the chart
 * narrows the Produtos the same way, and its links lead back to the table as
 * it was left. Every param falls back to "absent" on its own.
 */
const chartSearchSchema = z.object({
  x: z.string().optional().catch(undefined),
  y: z.string().optional().catch(undefined),
  ordem: z.string().regex(sortParamPattern).optional().catch(undefined),
  status: z.enum(testStatusFilters).optional().catch(undefined),
  q: z.string().max(searchTextMaxLength).optional().catch(undefined),
  cmp: compareParamSchema,
  novidades: z.literal("1").optional().catch(undefined),
  col: z.string().optional().catch(undefined),
});

/**
 * `/grafico/<categoria>?x=preco&y=nota`: the Gráfico, one dot per Produto on
 * two of the table's number columns, named by their slugs. Outside
 * `/$categoria/`, where `$id` would take `grafico` for a Produto.
 */
export const Route = createFileRoute("/grafico/$categoria")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...chartSearchSchema.parse(search),
    ...pickFilterSearch(search),
  }),
  beforeLoad: ({ params }) => {
    if (!isCategorySlug(params.categoria)) throw notFound({ routeId: rootRouteId });
    return { categorySlug: params.categoria };
  },
  loader: ({ context }) => loadCategoryData(context.categorySlug),
  component: ChartPage,
});

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
