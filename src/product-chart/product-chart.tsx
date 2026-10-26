import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef } from "react";
import { categoryLabels } from "@/categories";
import { CopyLinkButton } from "@/components/copy-link-button";
import type { CategoryData } from "@/data/schema";
import { BackToTableLink } from "@/product-detail/back-to-table-link";
import { categoryFiltersFor } from "@/product-filters/category-filters";
import { activeFilterCount, applyFilters } from "@/product-filters/filter-engine";
import { filterValuesFromSearch } from "@/product-filters/filter-link";
import type { HighlightDirection } from "@/product-compare/highlight-rules";
import { filterNovidades } from "@/product-table/novidades";
import { defaultTestStatus, filterProducts } from "@/product-table/product-filter";
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
  const products = useMemo(() => {
    const filtered = filterProducts(
      applyFilters(data.products, filters, filterValues),
      search.status ?? defaultTestStatus,
      search.q ?? "",
    );
    return search.novidades ? filterNovidades(filtered, meta.updatedAt) : filtered;
  }, [
    data.products,
    filters,
    filterValues,
    search.status,
    search.q,
    search.novidades,
    meta.updatedAt,
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
          className="font-serif text-heading-5 text-balance outline-none"
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
        <p aria-live="polite" className="text-fg-secondary tabular-nums">
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
          <ScatterPlot
            category={data.category}
            points={points}
            bestTradeOffs={bestTradeOffs}
            xAxis={xAxis}
            yAxis={yAxis}
            tableSearch={tableSearch}
            labelledBy={plotTitleId}
          />
          <figcaption className="max-w-prose text-pretty text-fg-secondary">
            <BestTradeOffsLegend xAxis={xAxis} yAxis={yAxis} />
          </figcaption>
          <ChartDataTable
            points={points}
            bestTradeOffs={bestTradeOffs}
            xAxis={xAxis}
            yAxis={yAxis}
          />
        </figure>
      ) : (
        <div className="rounded-lg border border-border px-4 py-6">
          <p className="font-medium text-pretty">
            {products.length === 0
              ? "Nenhum produto com essa busca, esses filtros e esse Status de teste."
              : `Nenhum produto tem ${xAxis.label} e ${yAxis.label}.`}
          </p>
        </div>
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
      <select
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-9 max-w-full min-w-48 rounded-lg border border-input bg-transparent px-2 text-base focus-visible:border-ring focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring pointer-coarse:h-10 pointer-fine:text-body-sm dark:bg-component"
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
        <circle cx="6" cy="6" r="5" className="fill-brand" />
      </svg>
      Melhores relações: nenhum outro produto é ao menos tão bom nos dois eixos e melhor em um (
      {xAxis.label}: {betterTexts[xAxis.direction]}; {yAxis.label}: {betterTexts[yAxis.direction]}).
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
  return (
    <table className="sr-only">
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
  );
}
