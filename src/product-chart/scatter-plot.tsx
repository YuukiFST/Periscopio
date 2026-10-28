import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { CategorySlug } from "@/categories";
import { useElementWidth } from "@/lib/use-element-width";
import { cn } from "@/lib/utils";
import { priceOf } from "@/product-table/cell-values";
import { PriceInReais } from "@/product-table/table-cells";
import { axisValueText, type ChartAxis } from "./chart-axes";
import type { ChartPoint } from "./chart-points";
import { isLogAxis, scaleOf, stepSpreadOf, strayOf, ticksOf } from "./chart-scales";
import type { TableSearch } from "@/product-table/table-search";

const margin = { top: 12, right: 16, bottom: 48, left: 76 };
/** How far from a dot the pointer still picks it, in pixels. */
const hoverRadius = 32;

/** A Produto's dot where it is drawn, strayed from its step on a step axis. */
type PlottedDot = { point: ChartPoint; x: number; y: number; isBest: boolean };

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

/** The name a dot's link reads: "H200A: Preço (₩) ₩ 59.000, Nota geral A, melhor relação". */
function pointLabel(point: ChartPoint, xAxis: ChartAxis, yAxis: ChartAxis, isBest: boolean) {
  const values = `${xAxis.label} ${axisValueText(xAxis, point.product)}, ${yAxis.label} ${axisValueText(yAxis, point.product)}`;
  return `${point.product.name}: ${values}${isBest ? ", melhor relação" : ""}`;
}

/** The dot nearest the pointer, within `hoverRadius`. */
function nearestDot(dots: readonly PlottedDot[], x: number, y: number): PlottedDot | undefined {
  let nearest: PlottedDot | undefined;
  let nearestDistance = hoverRadius ** 2;
  for (const dot of dots) {
    const distance = (dot.x - x) ** 2 + (dot.y - y) ** 2;
    if (distance <= nearestDistance) {
      nearest = dot;
      nearestDistance = distance;
    }
  }
  return nearest;
}

type ScatterPlotProps = {
  category: CategorySlug;
  points: readonly ChartPoint[];
  bestTradeOffs: readonly ChartPoint[] | undefined;
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  tableSearch: TableSearch;
  labelledBy: string;
  /** A Produto pointed at outside the plot, as in the Melhores relações list. */
  emphasizedId: string | undefined;
};

/**
 * One dot per Produto, each a link to its detail; hover near a dot or focus it
 * to see its name and both values. On a grade or count axis the dots stray a
 * little from their step, so a crowded step shows how many share it. The
 * Melhores relações sit on their step, filled in the brand color and joined by a line.
 */
export function ScatterPlot({
  category,
  points,
  bestTradeOffs,
  xAxis,
  yAxis,
  tableSearch,
  labelledBy,
  emphasizedId,
}: ScatterPlotProps) {
  const navigate = useNavigate();
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [focusedId, setFocusedId] = useState<string>();
  const activeId = hoveredId ?? focusedId ?? emphasizedId;
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
  const xSpread = stepSpreadOf(xAxis, xValues, xOf);
  const ySpread = stepSpreadOf(yAxis, yValues, yOf);
  const bestIds = new Set(bestTradeOffs?.map((point) => point.product.id));
  const dots: PlottedDot[] = points.map((point) => {
    const isBest = bestIds.has(point.product.id);
    const stray = isBest ? 0 : strayOf(point.product.id);
    return { point, x: xOf(point.x) + stray * xSpread, y: yOf(point.y) + stray * ySpread, isBest };
  });
  const bestDots = dots.filter((dot) => dot.isBest);
  const bestPath = bestDots.length > 1 ? bestTradeOffPath(bestDots, xAxis.direction) : undefined;
  const activeDot = dots.find((dot) => dot.point.product.id === activeId);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          role="group"
          aria-labelledby={labelledBy}
          width={width}
          height={height}
          className={cn("block overflow-visible text-caption", hoveredId && "cursor-pointer")}
          onPointerMove={(event) => {
            if (event.pointerType === "touch") return;
            const box = event.currentTarget.getBoundingClientRect();
            const nearest = nearestDot(dots, event.clientX - box.left, event.clientY - box.top);
            setHoveredId(nearest?.point.product.id);
          }}
          onPointerLeave={() => setHoveredId(undefined)}
          onClick={(event) => {
            // A click on a dot follows its own link; one beside it opens the dot the pointer picked.
            if (!hoveredId || (event.target instanceof Element && event.target.closest("a"))) {
              return;
            }
            void navigate({
              to: "/$categoria/$id",
              params: { categoria: category, id: hoveredId },
              search: tableSearch,
            });
          }}
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
            {activeDot && (
              <path
                d={`M${margin.left} ${activeDot.y}H${activeDot.x}V${plotBottom}`}
                strokeDasharray="2 3"
                className="fill-none stroke-foreground/40"
              />
            )}
          </g>
          {dots.map(({ point, x, y, isBest }) => (
            <Link
              key={point.product.id}
              to="/$categoria/$id"
              params={{ categoria: category, id: point.product.id }}
              search={tableSearch}
              aria-label={pointLabel(point, xAxis, yAxis, isBest)}
              data-best={isBest || undefined}
              className="group outline-none"
              onFocus={() => setFocusedId(point.product.id)}
              onBlur={() => setFocusedId(undefined)}
            >
              <g transform={`translate(${x},${y})`}>
                <circle r={12} className="fill-transparent" />
                {/* No ring, so dots that overlap darken where they stack and show the crowd. */}
                {!isBest && <circle r={isNarrow ? 3 : 3.5} className="fill-muted-foreground/70" />}
                <circle
                  r={10}
                  strokeWidth={2}
                  className="fill-none stroke-ring opacity-0 group-focus-visible:opacity-100"
                />
              </g>
            </Link>
          ))}
          {/* Drawn after every dot, so none covers a Melhor relação. */}
          <g aria-hidden="true" className="pointer-events-none">
            {bestDots.map((dot) => (
              <circle
                key={dot.point.product.id}
                cx={dot.x}
                cy={dot.y}
                r={4.5}
                strokeWidth={1.5}
                className="fill-highlight-fg stroke-background"
              />
            ))}
            {activeDot && (
              <circle
                cx={activeDot.x}
                cy={activeDot.y}
                r={6.5}
                strokeWidth={1.5}
                className="fill-none stroke-foreground"
              />
            )}
          </g>
        </svg>
      )}
      {activeDot && (
        <PointTooltip
          point={activeDot.point}
          xAxis={xAxis}
          yAxis={yAxis}
          left={activeDot.x}
          top={activeDot.y}
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
        <AxisValueRow axis={xAxis} point={point} />
        <AxisValueRow axis={yAxis} point={point} />
      </dl>
    </div>
  );
}

/** One axis in the tooltip; a Preço also reads in reais. */
function AxisValueRow({ axis, point }: { axis: ChartAxis; point: ChartPoint }) {
  const price = axis.column.kind === "price" ? priceOf(point.product) : undefined;
  return (
    <>
      <dt>{axis.label}</dt>
      <dd className="text-end text-foreground tabular-nums">
        {axisValueText(axis, point.product)}
        {price !== undefined && <PriceInReais priceKrw={price} />}
      </dd>
    </>
  );
}
