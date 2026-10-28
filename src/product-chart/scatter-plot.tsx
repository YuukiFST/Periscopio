import { Link } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import type { CategorySlug } from "@/categories";
import { isGradeField } from "@/data/rating-order";
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

/**
 * Past this ratio between the largest and the smallest amount, a linear axis
 * crowds most Produtos into a corner (one ₩ 1,8 mi mouse leaves the rest in the
 * first fifth), so the axis spreads its amounts by order of magnitude instead.
 */
const logScaleRatio = 20;

function isRatingAxis(axis: ChartAxis): boolean {
  return axis.column.kind === "field" && isGradeField(axis.column.field.key);
}

function isLogAxis(axis: ChartAxis, values: readonly number[]): boolean {
  if (isRatingAxis(axis)) return false;
  const min = Math.min(...values);
  return min > 0 && Math.max(...values) / min >= logScaleRatio;
}

/** Round amounts on a log axis: 1, 2 and 5 times each power of ten in range, only the 1s when narrow. */
function logTicks(min: number, max: number, isNarrow: boolean): number[] {
  const ticks: number[] = [];
  for (let power = Math.floor(Math.log10(min)); power <= Math.ceil(Math.log10(max)); power++) {
    for (const factor of isNarrow ? [1] : [1, 2, 5]) {
      const tick = factor * 10 ** power;
      if (tick >= min && tick <= max) ticks.push(tick);
    }
  }
  return ticks;
}

/** A grade axis ticks at each grade a Produto has; any other at round amounts. */
function ticksOf(
  axis: ChartAxis,
  points: readonly ChartPoint[],
  pick: "x" | "y",
  count: number,
  isLog: boolean,
): Tick[] {
  const values = points.map((point) => point[pick]);
  if (isRatingAxis(axis)) {
    const textByRank = new Map(
      points.map((point) => [point[pick], axisValueText(axis, point.product)] as const),
    );
    return [...textByRank].toSorted(([a], [b]) => a - b).map(([value, text]) => ({ value, text }));
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const logged = isLog ? logTicks(min, max, count < 5) : [];
  return (logged.length >= 2 ? logged : niceTicks(min, max, count)).map((value) => ({
    value,
    text: tickFormat.format(value),
  }));
}

/**
 * Maps a value onto `[from, to]` pixels, with 5% of room past the extreme values
 * and ticks; a log axis measures that room, and every distance, in powers of ten.
 */
function scaleOf(values: readonly number[], from: number, to: number, isLog: boolean) {
  const position = isLog ? Math.log10 : (value: number) => value;
  let min = Math.min(...values.map(position));
  let max = Math.max(...values.map(position));
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const room = (max - min) * 0.05;
  min -= room;
  max += room;
  return (value: number) => from + ((position(value) - min) / (max - min)) * (to - from);
}

/**
 * The Melhores relações as a staircase: each holds its vertical value until the
 * next one along the horizontal axis, so the corners mark what can be had.
 * With lower-is-better across, a step goes across first, then up or down.
 */
function bestTradeOffPath(
  positions: readonly { x: number; y: number }[],
  xDirection: ChartAxis["direction"],
): string {
  return positions
    .map((position, index) => {
      if (index === 0) return `M${position.x} ${position.y}`;
      return xDirection === "higher"
        ? `V${position.y}H${position.x}`
        : `H${position.x}V${position.y}`;
    })
    .join("");
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
function pointLabel(point: ChartPoint, xAxis: ChartAxis, yAxis: ChartAxis, isBest: boolean) {
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
  const [hoveredId, setHoveredId] = useState<string>();
  const [focusedId, setFocusedId] = useState<string>();
  const activeId = hoveredId ?? focusedId;
  const height = Math.round(Math.min(520, Math.max(280, width * 0.6)));
  const plotRight = width - margin.right;
  const plotBottom = height - margin.bottom;
  const isNarrow = width < 480;
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const isXLog = isLogAxis(xAxis, xValues);
  const isYLog = isLogAxis(yAxis, yValues);
  const xTicks = ticksOf(xAxis, points, "x", isNarrow ? 3 : 6, isXLog);
  const yTicks = ticksOf(yAxis, points, "y", 5, isYLog);
  const xOf = scaleOf(
    [...xValues, ...xTicks.map(({ value }) => value)],
    margin.left,
    plotRight,
    isXLog,
  );
  const yOf = scaleOf(
    [...yValues, ...yTicks.map(({ value }) => value)],
    plotBottom,
    margin.top,
    isYLog,
  );
  const bestIds = new Set(bestTradeOffs?.map((point) => point.product.id));
  const bestDots = bestTradeOffs?.map((point) => ({
    id: point.product.id,
    x: xOf(point.x),
    y: yOf(point.y),
  }));
  const bestPath =
    bestDots && bestDots.length > 1 ? bestTradeOffPath(bestDots, xAxis.direction) : undefined;
  const activePoint = points.find((point) => point.product.id === activeId);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          role="group"
          aria-labelledby={labelledBy}
          width={width}
          height={height}
          className="block overflow-visible text-caption"
        >
          <g aria-hidden="true">
            {xTicks.map((tick) => (
              <g key={tick.value} transform={`translate(${xOf(tick.value)},0)`}>
                <line y1={margin.top} y2={plotBottom} className="stroke-border/60" />
                <text y={plotBottom + 16} textAnchor="middle" className="fill-muted-foreground">
                  {tick.text}
                </text>
              </g>
            ))}
            {yTicks.map((tick) => (
              <g key={tick.value} transform={`translate(0,${yOf(tick.value)})`}>
                <line x1={margin.left} x2={plotRight} className="stroke-border/60" />
                <text
                  x={margin.left - 8}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground"
                >
                  {tick.text}
                </text>
              </g>
            ))}
            <text
              x={(margin.left + plotRight) / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-foreground font-medium"
            >
              {isXLog ? `${xAxis.label}, escala logarítmica` : xAxis.label}
            </text>
            <text
              transform={`translate(14,${(margin.top + plotBottom) / 2}) rotate(-90)`}
              textAnchor="middle"
              className="fill-foreground font-medium"
            >
              {isYLog ? `${yAxis.label}, escala logarítmica` : yAxis.label}
            </text>
            {bestPath && (
              <path
                d={bestPath}
                strokeWidth={1.5}
                strokeLinejoin="round"
                className="fill-none stroke-highlight-fg"
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
                onMouseEnter={() => setHoveredId(point.product.id)}
                onMouseLeave={() => setHoveredId(undefined)}
                onFocus={() => setFocusedId(point.product.id)}
                onBlur={() => setFocusedId(undefined)}
              >
                <g transform={`translate(${xOf(point.x)},${yOf(point.y)})`}>
                  <circle r={12} className="fill-transparent" />
                  {/* No ring, so dots that overlap darken where they stack and show the crowd. */}
                  {!isBest && (
                    <circle r={isNarrow ? 3 : 3.5} className="fill-muted-foreground/70" />
                  )}
                  <circle
                    r={10}
                    strokeWidth={2}
                    className="fill-none stroke-ring opacity-0 group-focus-visible:opacity-100"
                  />
                </g>
              </Link>
            );
          })}
          {/* Drawn after every dot, so none covers a Melhor relação. */}
          <g aria-hidden="true" className="pointer-events-none">
            {bestDots?.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r={4.5}
                strokeWidth={1.5}
                className="fill-highlight-fg stroke-background"
              />
            ))}
            {activePoint && (
              <circle
                cx={xOf(activePoint.x)}
                cy={yOf(activePoint.y)}
                r={6}
                strokeWidth={1.5}
                className="fill-none stroke-foreground"
              />
            )}
          </g>
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
        "pointer-events-none absolute z-10 w-max max-w-64 -translate-y-full rounded-lg bg-popover px-3 py-2 shadow-surface-5",
        align,
      )}
    >
      <p className="font-medium text-pretty">{point.product.name}</p>
      <dl className="grid grid-cols-[auto_auto] gap-x-3 text-muted-foreground">
        <dt>{xAxis.label}</dt>
        <dd className="text-end text-foreground tabular-nums">
          {axisValueText(xAxis, point.product)}
        </dd>
        <dt>{yAxis.label}</dt>
        <dd className="text-end text-foreground tabular-nums">
          {axisValueText(yAxis, point.product)}
        </dd>
      </dl>
    </div>
  );
}
