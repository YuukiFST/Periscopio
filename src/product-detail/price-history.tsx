import { useEffect, useState } from "react";
import type { CategorySlug } from "@/categories";
import { loadPriceHistory } from "@/data/load-data";
import type { PriceEntry, PriceHistory } from "@/data/schema";
import { formatPrice } from "@/product-table/cell-values";

const dayMs = 24 * 60 * 60 * 1000;
/** Fewer entries say too little for "Menor preço". */
const minEntriesForLowest = 4;
const sparklineWidth = 160;
const sparklineHeight = 40;
/** Room for the stroke and the end dot inside the SVG. */
const sparklinePadding = 4;
/** An entry date is a calendar day, kept as UTC midnight by `Date.parse("2026-10-22")`. */
const entryDateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });

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

/** A step line: each Preço holds until the next entry, along a time axis. */
function sparklinePoints(entries: readonly PriceEntry[]): { x: number; y: number }[] {
  const times = entries.map((entry) => Date.parse(entry.date));
  const prices = entries.map((entry) => entry.priceKrw);
  const start = Math.min(...times);
  const timeSpan = Math.max(...times) - start || 1;
  const max = Math.max(...prices);
  const priceSpan = max - Math.min(...prices) || 1;
  const innerWidth = sparklineWidth - 2 * sparklinePadding;
  const innerHeight = sparklineHeight - 2 * sparklinePadding;
  return entries.map((entry) => ({
    x: sparklinePadding + ((Date.parse(entry.date) - start) / timeSpan) * innerWidth,
    y: sparklinePadding + ((max - entry.priceKrw) / priceSpan) * innerHeight,
  }));
}

function sparklinePath(points: readonly { x: number; y: number }[]): string {
  return points
    .map((point, index) => (index === 0 ? `M${point.x} ${point.y}` : `H${point.x}V${point.y}`))
    .join("");
}

/**
 * The Histórico de preço under the Preço: a sparkline with the lowest and the
 * highest Preço, and the labels the last change earns. Hidden with fewer than
 * two entries, or when the history ends on another Preço than the Produto shows.
 */
export function PriceHistorySparkline({
  category,
  productId,
  priceKrw,
}: {
  category: CategorySlug;
  productId: string;
  priceKrw: number;
}) {
  const entries = usePriceHistory(category)?.products[productId];
  const first = entries?.[0];
  const last = entries?.at(-1);
  if (!entries || entries.length < 2 || !first || last?.priceKrw !== priceKrw) return null;
  const prices = entries.map((entry) => entry.priceKrw);
  const points = sparklinePoints(entries);
  const end = points.at(-1);
  const labels = priceHistoryLabels(entries);
  const span = `de ${entryDateFormat.format(Date.parse(first.date))} a ${entryDateFormat.format(Date.parse(last.date))}`;
  return (
    <div className="mt-2 flex flex-col gap-2 font-normal">
      <div className="flex items-stretch gap-2">
        <svg
          role="img"
          aria-label={`Histórico de preço: ${entries.length} preços ${span}`}
          width={sparklineWidth}
          height={sparklineHeight}
          viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
          className="shrink-0 text-fg-secondary"
        >
          <path
            d={sparklinePath(points)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {end && <circle cx={end.x} cy={end.y} r={3} className="fill-fg-primary" />}
        </svg>
        <div className="flex flex-col justify-between text-caption-sm whitespace-nowrap text-fg-secondary tabular-nums">
          <span>máx. {formatPrice(Math.max(...prices))}</span>
          <span>mín. {formatPrice(Math.min(...prices))}</span>
        </div>
      </div>
      {labels.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <li
              key={label}
              className="rounded-sm bg-positive-subtle px-1.5 text-caption-sm font-medium whitespace-nowrap text-positive-fg"
            >
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
