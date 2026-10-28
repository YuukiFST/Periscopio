import { getRouteApi } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { categoryLabels } from "@/categories";
import { CopyLinkButton } from "@/components/copy-link-button";
import type { CategoryData } from "@/data/schema";
import { BackToTableLink } from "@/product-detail/back-to-table-link";
import { categoryFiltersFor } from "@/product-filters/category-filters";
import { activeFilterCount, applyFilters } from "@/product-filters/filter-engine";
import { filterValuesFromSearch } from "@/product-filters/filter-link";
import type { HighlightDirection } from "@/product-compare/highlight-rules";
import { useFavoriteIds } from "@/product-table/favorite-products";
import { filterNovidades } from "@/product-table/novidades";
import {
  defaultTestStatus,
  filterFavoriteProducts,
  filterProducts,
} from "@/product-table/product-filter";
import { productCount } from "@/product-table/table-toolbar";
import {
  axisValueText,
  chartAxisGroupsFor,
  chartAxisOf,
  defaultXSlug,
  defaultYSlug,
  type ChartAxis,
  type ChartAxisGroup,
} from "./chart-axes";
import { bestTradeOffsOf, chartPointsOf, type ChartPoint } from "./chart-points";
import { BestTradeOffList } from "./best-trade-off-list";
import { ScatterPlot } from "./scatter-plot";
import type { TableSearch } from "@/product-table/table-search";

const rootRoute = getRouteApi("__root__");

/** The table's search, plus the slugs of the columns on each axis. */
export type ChartSearch = TableSearch & { x?: string; y?: string };

const statusLabels = { testados: "Testados", "nao-testados": "Não testados", todos: "Todos" };

const betterTexts: Record<HighlightDirection, string> = {
  lower: "menor é melhor",
  higher: "maior é melhor",
  none: "sem lado melhor",
};

/** What narrows the Produtos, as the table left it: "Testados · busca “pro” · 2 filtros". */
function narrowingText(search: ChartSearch, filterCount: number): string {
  const parts = [statusLabels[search.status ?? defaultTestStatus]];
  if (search.q) parts.push(`busca “${search.q}”`);
  if (filterCount > 0) parts.push(filterCount === 1 ? "1 filtro" : `${filterCount} filtros`);
  if (search.novidades) parts.push("Novidades");
  if (search.favoritos) parts.push("Favoritos");
  return parts.join(" · ");
}

type ProductChartProps = {
  data: CategoryData;
  search: ChartSearch;
  onAxisChange: (axis: "x" | "y", slug: string) => void;
};

/**
 * The Gráfico of a Categoria: its Produtos, narrowed as the table narrows
 * them, on two number columns, with the Melhores relações marked.
 */
export function ProductChart({ data, search, onAxisChange }: ProductChartProps) {
  const meta = rootRoute.useLoaderData();
  const { x, y, ...tableSearch } = search;
  const axisGroups = useMemo(() => chartAxisGroupsFor(data), [data]);
  const xAxis = chartAxisOf(axisGroups, x, defaultXSlug);
  const yAxis = chartAxisOf(axisGroups, y, defaultYSlug);

  const filters = useMemo(() => categoryFiltersFor(data), [data]);
  const filterValues = useMemo(() => filterValuesFromSearch(filters, search), [filters, search]);
  const [favoriteIds] = useFavoriteIds(data.category);
  const products = useMemo(() => {
    const filtered = filterProducts(
      applyFilters(data.products, filters, filterValues),
      search.status ?? defaultTestStatus,
      search.q ?? "",
    );
    const shown = search.novidades ? filterNovidades(filtered, meta.updatedAt) : filtered;
    return search.favoritos ? filterFavoriteProducts(shown, favoriteIds) : shown;
  }, [
    data.products,
    filters,
    filterValues,
    search.status,
    search.q,
    search.novidades,
    meta.updatedAt,
    search.favoritos,
    favoriteIds,
  ]);
  const points = useMemo(() => chartPointsOf(products, xAxis, yAxis), [products, xAxis, yAxis]);
  const bestTradeOffs = useMemo(
    () => bestTradeOffsOf(points, xAxis.direction, yAxis.direction),
    [points, xAxis, yAxis],
  );

  const categoryName = categoryLabels[data.category].toLowerCase();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `Gráfico de ${categoryName} · Periscópio`;
    // A new view in a single-page app: screen readers and the keyboard start from its title.
    headingRef.current?.focus();
  }, [categoryName]);

  const headingId = useId();
  const plotTitleId = useId();
  const [emphasizedId, setEmphasizedId] = useState<string>();
  const leftOut = products.length - points.length;
  return (
    // The plot's height follows its width, so a scrollbar coming and going must not change the width.
    <article
      aria-labelledby={headingId}
      className="-m-1.5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-1.5 [scrollbar-gutter:stable]"
    >
      <BackToTableLink category={data.category} search={tableSearch} />
      <div className="flex items-start justify-between gap-4">
        <h1
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="text-display text-balance outline-none"
        >
          Gráfico de {categoryName}
        </h1>
        <CopyLinkButton />
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <AxisSelect
          label="Eixo horizontal"
          groups={axisGroups}
          value={xAxis.slug}
          onValueChange={(slug) => onAxisChange("x", slug)}
        />
        <AxisSelect
          label="Eixo vertical"
          groups={axisGroups}
          value={yAxis.slug}
          onValueChange={(slug) => onAxisChange("y", slug)}
        />
        <p aria-live="polite" className="min-w-0 wrap-anywhere text-muted-foreground tabular-nums">
          {narrowingText(search, activeFilterCount(filters, filterValues))}:{" "}
          {productCount(points.length)} no gráfico
          {leftOut > 0 && `, ${leftOut} sem dado em um dos eixos`}
        </p>
      </div>
      {points.length > 0 ? (
        <figure className="flex flex-col gap-3">
          <h2 id={plotTitleId} className="sr-only">
            {yAxis.label} por {xAxis.label}
          </h2>
          <figcaption className="max-w-prose text-pretty text-muted-foreground">
            <BestTradeOffsLegend xAxis={xAxis} yAxis={yAxis} />
          </figcaption>
          <ScatterPlot
            category={data.category}
            points={points}
            bestTradeOffs={bestTradeOffs}
            xAxis={xAxis}
            yAxis={yAxis}
            tableSearch={tableSearch}
            labelledBy={plotTitleId}
            emphasizedId={emphasizedId}
          />
          {bestTradeOffs && bestTradeOffs.length > 0 && (
            <BestTradeOffList
              category={data.category}
              bestTradeOffs={bestTradeOffs}
              xAxis={xAxis}
              yAxis={yAxis}
              tableSearch={tableSearch}
              onEmphasize={setEmphasizedId}
            />
          )}
          <ChartDataTable
            points={points}
            bestTradeOffs={bestTradeOffs}
            xAxis={xAxis}
            yAxis={yAxis}
          />
        </figure>
      ) : (
        <p className="max-w-prose py-6 text-pretty">
          {products.length === 0
            ? "Nenhum produto com a busca, os filtros e o Status de teste da tabela. Volte para a tabela e mude algum deles."
            : `Nenhum produto tem ${xAxis.label} e ${yAxis.label}. Escolha outra coluna em um dos eixos.`}
        </p>
      )}
    </article>
  );
}

type AxisSelectProps = {
  label: string;
  groups: readonly ChartAxisGroup[];
  value: string;
  onValueChange: (slug: string) => void;
};

function AxisSelect({ label, groups, value, onValueChange }: AxisSelectProps) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="relative max-w-full">
        <select
          id={id}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-9 max-w-full min-w-48 appearance-none rounded-lg border border-input bg-transparent ps-2.5 pe-8 text-base field-sizing-content focus-visible:border-ring focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring pointer-coarse:h-10 pointer-fine:text-body dark:bg-muted"
        >
          {groups.map((group) => (
            <optgroup key={group.title} label={group.title}>
              {group.axes.map((axis) => (
                <option key={axis.slug} value={axis.slug}>
                  {axis.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}

function BestTradeOffsLegend({ xAxis, yAxis }: { xAxis: ChartAxis; yAxis: ChartAxis }) {
  const noDirection = [xAxis, yAxis].find((axis) => axis.direction === "none");
  if (noDirection) {
    return <>Sem melhores relações: {noDirection.label} não tem um lado melhor.</>;
  }
  return (
    <>
      <svg aria-hidden="true" width="12" height="12" className="me-1.5 inline-block align-baseline">
        <circle cx="6" cy="6" r="4.5" className="fill-highlight-fg" />
      </svg>
      Melhores relações: nenhum outro produto é ao menos tão bom nos dois eixos e melhor em um.{" "}
      {xAxis.label}: {betterTexts[xAxis.direction]}. {yAxis.label}: {betterTexts[yAxis.direction]}.
    </>
  );
}

type ChartDataTableProps = {
  points: readonly ChartPoint[];
  bestTradeOffs: readonly ChartPoint[] | undefined;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
};

/** The dots as rows, for screen readers. */
function ChartDataTable({ points, bestTradeOffs, xAxis, yAxis }: ChartDataTableProps) {
  const bestIds = new Set(bestTradeOffs?.map((point) => point.product.id));
  // The box hides it: a table grows to fit its cells past `sr-only`'s 1px width.
  return (
    <div className="sr-only">
      <table>
        <caption>Dados do gráfico</caption>
        <thead>
          <tr>
            <th scope="col">Produto</th>
            <th scope="col">{xAxis.label}</th>
            <th scope="col">{yAxis.label}</th>
            {bestTradeOffs && <th scope="col">Melhor relação</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.product.id}>
              <th scope="row">{point.product.name}</th>
              <td>{axisValueText(xAxis, point.product)}</td>
              <td>{axisValueText(yAxis, point.product)}</td>
              {bestTradeOffs && <td>{bestIds.has(point.product.id) ? "Sim" : "Não"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
