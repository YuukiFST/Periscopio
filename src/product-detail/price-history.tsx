import { useEffect, useId, useState } from "react";
import type { CategorySlug } from "@/categories";
import { loadPriceHistory } from "@/data/load-data";
import type { PriceEntry, PriceHistory } from "@/data/schema";
import { useElementWidth } from "@/lib/use-element-width";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/product-table/cell-values";

const dayMs = 24 * 60 * 60 * 1000;
/** Fewer entries say too little for "Menor preço". */
const minEntriesForLowest = 4;
const chartHeight = 132;
/** Room above the highest Preço and below the lowest for their labels, and below that for the dates. */
const priceChartRoom = { labelRoom: 20, dateRoom: 22, endRoom: 5 };
/**
 * The least span the Preço axis shows, as a share of the highest Preço, so a
 * ₩ 600 change on a ₩ 79.700 mouse reads as the small step it is.
 */
const minPriceSpanShare = 0.1;
/** An entry date is a calendar day, kept as UTC midnight by `Date.parse("2026-10-22")`. */
const entryDateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });
const axisDateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const changeFormat = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

/**
 * The Categoria's Histórico de preço, fetched when a detail opens. Undefined
 * while it loads, or when it fails: the detail then shows the Preço alone.
 */
function usePriceHistory(category: CategorySlug): PriceHistory | undefined {
  const [history, setHistory] = useState<PriceHistory>();
  useEffect(() => {
    let isCurrent = true;
    loadPriceHistory(category).then(
      (loaded) => isCurrent && setHistory(loaded),
      () => isCurrent && setHistory(undefined),
    );
    return () => {
      isCurrent = false;
    };
  }, [category]);
  return history?.category === category ? history : undefined;
}

/** "Menor preço em N semanas" and "Caiu N%", for the last entry. */
function priceHistoryLabels(entries: readonly PriceEntry[]): string[] {
  const first = entries[0];
  const previous = entries.at(-2);
  const last = entries.at(-1);
  if (!first || !previous || !last) return [];
  const labels: string[] = [];
  const isLowest = entries.every((entry) => last.priceKrw <= entry.priceKrw);
  if (entries.length >= minEntriesForLowest && isLowest) {
    const weeks = Math.max(
      1,
      Math.round((Date.parse(last.date) - Date.parse(first.date)) / (7 * dayMs)),
    );
    labels.push(`Menor preço em ${weeks} ${weeks === 1 ? "semana" : "semanas"}`);
  }
  const drop = (previous.priceKrw - last.priceKrw) / previous.priceKrw;
  if (drop >= 0.1) labels.push(`Caiu ${Math.round(drop * 100)}%`);
  return labels;
}

/** "caiu 6,2%" or "subiu 4%" from the entry before; undefined for the first. */
function changeText(entries: readonly PriceEntry[], index: number): string | undefined {
  const previous = entries[index - 1];
  const entry = entries[index];
  if (!previous || !entry || previous.priceKrw === entry.priceKrw) return undefined;
  const change = (entry.priceKrw - previous.priceKrw) / previous.priceKrw;
  return `${change < 0 ? "caiu" : "subiu"} ${changeFormat.format(Math.abs(change))}`;
}

type PlottedEntry = { entry: PriceEntry; x: number; y: number };

/** Each entry on a time axis across `width`, the highest Preço at the top label's foot. */
function plotEntries(entries: readonly PriceEntry[], width: number): PlottedEntry[] {
  const times = entries.map((entry) => Date.parse(entry.date));
  const prices = entries.map((entry) => entry.priceKrw);
  const start = Math.min(...times);
  const timeSpan = Math.max(...times) - start || 1;
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const priceSpan = Math.max(max - min, max * minPriceSpanShare);
  const plotTop = priceChartRoom.labelRoom;
  const plotHeight = chartHeight - priceChartRoom.dateRoom - 2 * priceChartRoom.labelRoom;
  const plotWidth = width - 2 * priceChartRoom.endRoom;
  return entries.map((entry) => ({
    entry,
    x: priceChartRoom.endRoom + ((Date.parse(entry.date) - start) / timeSpan) * plotWidth,
    y: plotTop + ((max - entry.priceKrw) / priceSpan) * plotHeight,
  }));
}

/** A step line: each Preço holds until the next entry. */
function stepPath(plotted: readonly PlottedEntry[]): string {
  return plotted
    .map((point, index) => (index === 0 ? `M${point.x} ${point.y}` : `H${point.x}V${point.y}`))
    .join("");
}

/** The entry nearest the pointer along the time axis. */
function nearestEntryIndex(plotted: readonly PlottedEntry[], x: number): number {
  let nearest = 0;
  plotted.forEach((point, index) => {
    if (Math.abs(point.x - x) < Math.abs((plotted[nearest]?.x ?? 0) - x)) nearest = index;
  });
  return nearest;
}

/**
 * The Histórico de preço as its own section of the detail: a step chart with
 * the lowest and the highest Preço, the first and the last date, each entry's
 * date and Preço under the pointer, and the labels the last change earns.
 * Hidden with fewer than two entries, or when the history ends on another
 * Preço than the Produto shows.
 */
export function PriceHistorySection({
  category,
  productId,
  priceKrw,
}: {
  category: CategorySlug;
  productId: string;
  priceKrw: number;
}) {
  const headingId = useId();
  const entries = usePriceHistory(category)?.products[productId];
  const first = entries?.[0];
  const last = entries?.at(-1);
  if (!entries || entries.length < 2 || !first || last?.priceKrw !== priceKrw) return null;
  const labels = priceHistoryLabels(entries);
  const span = `de ${entryDateFormat.format(Date.parse(first.date))} a ${entryDateFormat.format(Date.parse(last.date))}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={headingId} className="text-title font-medium">
          Histórico de preço
        </h3>
        {labels.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <li
                key={label}
                className="rounded-sm bg-emerald-500/10 px-1.5 text-micro font-medium whitespace-nowrap text-emerald-700 dark:text-emerald-400"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <PriceHistoryChart
        entries={entries}
        label={`Histórico de preço: ${entries.length} preços ${span}`}
      />
      {/* The box hides it: a table grows to fit its cells past `sr-only`'s 1px width. */}
      <div className="sr-only">
        <table>
          <caption>Preços do histórico</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Preço</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.date}>
                <td>{entryDateFormat.format(Date.parse(entry.date))}</td>
                <td>{formatPrice(entry.priceKrw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The chart itself, named by `label`; the table beside it reads every entry. */
function PriceHistoryChart({ entries, label }: { entries: readonly PriceEntry[]; label: string }) {
  const gradientId = useId();
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number>();
  const plotted = width > 0 ? plotEntries(entries, width) : [];
  const prices = entries.map((entry) => entry.priceKrw);
  const maxY = Math.min(...plotted.map((point) => point.y));
  const minY = Math.max(...plotted.map((point) => point.y));
  const firstPoint = plotted[0];
  const lastPoint = plotted.at(-1);
  const active = activeIndex === undefined ? undefined : plotted[activeIndex];
  const line = stepPath(plotted);
  const plotBottom = chartHeight - priceChartRoom.dateRoom;
  const activeChange = activeIndex === undefined ? undefined : changeText(entries, activeIndex);
  return (
    <div ref={containerRef} className="relative w-full" style={{ height: chartHeight }}>
      {firstPoint && lastPoint && (
        <svg
          role="img"
          aria-label={label}
          width={width}
          height={chartHeight}
          className="block overflow-visible text-micro"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setActiveIndex(nearestEntryIndex(plotted, event.clientX - box.left));
          }}
          onPointerLeave={() => setActiveIndex(undefined)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity={0.14} />
              <stop offset="1" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <g aria-hidden="true">
            <line
              x1={0}
              x2={width}
              y1={maxY}
              y2={maxY}
              strokeDasharray="2 3"
              className="stroke-border"
            />
            <line
              x1={0}
              x2={width}
              y1={minY}
              y2={minY}
              strokeDasharray="2 3"
              className="stroke-border"
            />
            <text y={maxY - 6} className="fill-muted-foreground tabular-nums">
              máx. {formatPrice(Math.max(...prices))}
            </text>
            <text y={minY + 14} className="fill-muted-foreground tabular-nums">
              mín. {formatPrice(Math.min(...prices))}
            </text>
            <path
              d={`${line}V${plotBottom}H${firstPoint.x}Z`}
              fill={`url(#${gradientId})`}
              className="text-foreground"
            />
            <path
              d={line}
              strokeWidth={1.5}
              strokeLinejoin="round"
              className="fill-none stroke-foreground"
            />
            {plotted.slice(0, -1).map((point) => (
              <circle
                key={point.entry.date}
                cx={point.x}
                cy={point.y}
                r={2}
                className="fill-muted-foreground"
              />
            ))}
            <circle cx={lastPoint.x} cy={lastPoint.y} r={3.5} className="fill-foreground" />
            <text x={0} y={chartHeight - 4} className="fill-muted-foreground">
              {axisDateFormat.format(Date.parse(firstPoint.entry.date))}
            </text>
            <text x={width} y={chartHeight - 4} textAnchor="end" className="fill-muted-foreground">
              {axisDateFormat.format(Date.parse(lastPoint.entry.date))}
            </text>
            {active && (
              <>
                <line
                  x1={active.x}
                  x2={active.x}
                  y1={0}
                  y2={plotBottom}
                  className="stroke-foreground/40"
                />
                <circle
                  cx={active.x}
                  cy={active.y}
                  r={4.5}
                  strokeWidth={1.5}
                  className="fill-background stroke-foreground"
                />
              </>
            )}
          </g>
        </svg>
      )}
      {active && (
        <div
          role="tooltip"
          // Beside the guide line, on the side with more room, so it covers neither the heading nor the entry.
          style={{ left: active.x < width / 2 ? active.x + 10 : active.x - 10, top: 0 }}
          className={cn(
            "pointer-events-none absolute z-10 w-max rounded-lg bg-popover px-3 py-2 shadow-surface-5",
            active.x >= width / 2 && "-translate-x-full",
          )}
        >
          <p className="text-caption text-muted-foreground">
            {entryDateFormat.format(Date.parse(active.entry.date))}
          </p>
          <p className="font-medium tabular-nums">{formatPrice(active.entry.priceKrw)}</p>
          {activeChange && (
            <p className="text-caption text-muted-foreground tabular-nums">{activeChange}</p>
          )}
        </div>
      )}
    </div>
  );
}
