import { Link } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import type { CategorySlug } from "@/categories";
import { isRatingField } from "@/data/rating-order";
import { cn } from "@/lib/utils";
import { axisValueText, type ChartAxis } from "./chart-axes";
import { niceTicks, type ChartPoint } from "./chart-points";
import type { TableSearch } from "@/product-table/table-search";

const margin = { top: 12, right: 16, bottom: 48, left: 76 };
const tickFormat = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

type Tick = { value: number; text: string };

/** A grade axis ticks at each grade a Produto has; any other at round amounts. */
function ticksOf(
  axis: ChartAxis,
  points: readonly ChartPoint[],
  pick: "x" | "y",
  count: number,
): Tick[] {
  const values = points.map((point) => point[pick]);
  if (axis.column.kind === "field" && isRatingField(axis.column.field.key)) {
    const textByRank = new Map(
      points.map((point) => [point[pick], axisValueText(axis, point.product)] as const),
    );
    return [...textByRank].toSorted(([a], [b]) => a - b).map(([value, text]) => ({ value, text }));
  }
  return niceTicks(Math.min(...values), Math.max(...values), count).map((value) => ({
    value,
    text: tickFormat.format(value),
  }));
}

/** Maps a value onto `[from, to]` pixels, with 5% of room past the extreme values and ticks. */
function scaleOf(values: readonly number[], from: number, to: number) {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const room = (max - min) * 0.05;
  min -= room;
  max += room;
  return (value: number) => from + ((value - min) / (max - min)) * (to - from);
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** The name a dot's link reads: "H200A: Preço (₩) ₩ 59.000, Nota geral A, melhor relação". */
export function pointLabel(point: ChartPoint, xAxis: ChartAxis, yAxis: ChartAxis, isBest: boolean) {
  const values = `${xAxis.label} ${axisValueText(xAxis, point.product)}, ${yAxis.label} ${axisValueText(yAxis, point.product)}`;
  return `${point.product.name}: ${values}${isBest ? ", melhor relação" : ""}`;
}

type ScatterPlotProps = {
  category: CategorySlug;
  points: readonly ChartPoint[];
  bestTradeOffs: readonly ChartPoint[] | undefined;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  tableSearch: TableSearch;
  labelledBy: string;
};

/**
 * One dot per Produto, each a link to its detail; hover or focus shows its
 * name and both values. The Melhores relações are filled in the brand color
 * and joined by a line.
 */
export function ScatterPlot({
  category,
  points,
  bestTradeOffs,
  xAxis,
  yAxis,
  tableSearch,
  labelledBy,
}: ScatterPlotProps) {
  const [containerRef, width] = useWidth();
  const [activeId, setActiveId] = useState<string>();
  const height = Math.round(Math.min(520, Math.max(280, width * 0.6)));
  const plotRight = width - margin.right;
  const plotBottom = height - margin.bottom;
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xTicks = ticksOf(xAxis, points, "x", width < 480 ? 3 : 6);
  const yTicks = ticksOf(yAxis, points, "y", 5);
  const xOf = scaleOf([...xValues, ...xTicks.map(({ value }) => value)], margin.left, plotRight);
  const yOf = scaleOf([...yValues, ...yTicks.map(({ value }) => value)], plotBottom, margin.top);
  const bestIds = new Set(bestTradeOffs?.map((point) => point.product.id));
  const bestLine = bestTradeOffs
    ?.map((point) => `${xOf(point.x).toFixed(1)},${yOf(point.y).toFixed(1)}`)
    .join(" ");
  const activePoint = points.find((point) => point.product.id === activeId);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          role="group"
          aria-labelledby={labelledBy}
          width={width}
          height={height}
          className="block overflow-visible text-caption-lg"
        >
          <g aria-hidden="true">
            {xTicks.map((tick) => (
              <g key={tick.value} transform={`translate(${xOf(tick.value)},0)`}>
                <line y1={margin.top} y2={plotBottom} className="stroke-border-subtle" />
                <text y={plotBottom + 16} textAnchor="middle" className="fill-fg-secondary">
                  {tick.text}
                </text>
              </g>
            ))}
            {yTicks.map((tick) => (
              <g key={tick.value} transform={`translate(0,${yOf(tick.value)})`}>
                <line x1={margin.left} x2={plotRight} className="stroke-border-subtle" />
                <text
                  x={margin.left - 8}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-fg-secondary"
                >
                  {tick.text}
                </text>
              </g>
            ))}
            <text
              x={(margin.left + plotRight) / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-fg-primary font-medium"
            >
              {xAxis.label}
            </text>
            <text
              transform={`translate(14,${(margin.top + plotBottom) / 2}) rotate(-90)`}
              textAnchor="middle"
              className="fill-fg-primary font-medium"
            >
              {yAxis.label}
            </text>
            {bestLine && (
              <polyline
                points={bestLine}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                className="fill-none stroke-brand"
              />
            )}
          </g>
          {points.map((point) => {
            const isBest = bestIds.has(point.product.id);
            return (
              <Link
                key={point.product.id}
                to="/$categoria/$id"
                params={{ categoria: category, id: point.product.id }}
                search={tableSearch}
                aria-label={pointLabel(point, xAxis, yAxis, isBest)}
                data-best={isBest || undefined}
                className="group outline-none"
                onMouseEnter={() => setActiveId(point.product.id)}
                onMouseLeave={() => setActiveId(undefined)}
                onFocus={() => setActiveId(point.product.id)}
                onBlur={() => setActiveId(undefined)}
              >
                <g transform={`translate(${xOf(point.x)},${yOf(point.y)})`}>
                  <circle r={12} className="fill-transparent" />
                  <circle
                    r={isBest ? 6 : 5}
                    strokeWidth={1.5}
                    className={cn(
                      "stroke-page",
                      isBest ? "fill-brand" : "fill-fg-tertiary group-hover:fill-fg-secondary",
                    )}
                  />
                  <circle
                    r={10}
                    strokeWidth={2}
                    className="fill-none stroke-ring opacity-0 group-focus-visible:opacity-100"
                  />
                </g>
              </Link>
            );
          })}
        </svg>
      )}
      {activePoint && (
        <PointTooltip
          point={activePoint}
          xAxis={xAxis}
          yAxis={yAxis}
          left={xOf(activePoint.x)}
          top={yOf(activePoint.y)}
          width={width}
        />
      )}
    </div>
  );
}

type PointTooltipProps = {
  point: ChartPoint;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  left: number;
  top: number;
  width: number;
};

/** Not tied to the dot by `aria-describedby`: the dot's link already reads all of this. */
function PointTooltip({ point, xAxis, yAxis, left, top, width }: PointTooltipProps) {
  // Near an edge the box opens toward the middle, so it stays inside the chart.
  const align =
    left < width * 0.3
      ? "translate-x-0"
      : left > width * 0.7
        ? "-translate-x-full"
        : "-translate-x-1/2";
  return (
    <div
      role="tooltip"
      style={{ left, top: top - 14 }}
      className={cn(
        "pointer-events-none absolute z-10 w-max max-w-64 -translate-y-full rounded-lg bg-popover px-3 py-2 shadow-large",
        align,
      )}
    >
      <p className="font-medium text-pretty">{point.product.name}</p>
      <dl className="grid grid-cols-[auto_auto] gap-x-3 text-fg-secondary">
        <dt>{xAxis.label}</dt>
        <dd className="text-end text-fg-primary tabular-nums">
          {axisValueText(xAxis, point.product)}
        </dd>
        <dt>{yAxis.label}</dt>
        <dd className="text-end text-fg-primary tabular-nums">
          {axisValueText(yAxis, point.product)}
        </dd>
      </dl>
    </div>
  );
}
