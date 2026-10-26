import type { Product } from "../data/schema.ts";
import type { HighlightDirection } from "../product-compare/highlight-rules.ts";
import { axisValueOf, type ChartAxis } from "./chart-axes.ts";

/** A Produto with a value on both axes. */
export type ChartPoint = { product: Product; x: number; y: number };

/** The Produtos with both values, by x then y, the order the keyboard walks the dots in. */
export function chartPointsOf(
  products: readonly Product[],
  xAxis: ChartAxis,
  yAxis: ChartAxis,
): ChartPoint[] {
  return products
    .flatMap((product) => {
      const x = axisValueOf(xAxis, product);
      const y = axisValueOf(yAxis, product);
      return x === undefined || y === undefined ? [] : [{ product, x, y }];
    })
    .toSorted((a, b) => a.x - b.x || a.y - b.y);
}

type BetterDirection = Exclude<HighlightDirection, "none">;

/** How much better `a` is than `b` in that direction: positive when better, 0 when level. */
function lead(direction: BetterDirection, a: number, b: number): number {
  return direction === "lower" ? b - a : a - b;
}

/**
 * The Melhores relações: each point no other point beats on one axis without
 * losing on the other. Undefined when an axis has no better direction.
 */
export function bestTradeOffsOf(
  points: readonly ChartPoint[],
  xDirection: HighlightDirection,
  yDirection: HighlightDirection,
): ChartPoint[] | undefined {
  if (xDirection === "none" || yDirection === "none") return undefined;
  return points.filter(
    (point) =>
      !points.some((other) => {
        const xLead = lead(xDirection, other.x, point.x);
        const yLead = lead(yDirection, other.y, point.y);
        return xLead >= 0 && yLead >= 0 && (xLead > 0 || yLead > 0);
      }),
  );
}

/** About `count` round ticks from `min` to `max`: steps of 1, 2 or 5 times a power of ten. */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const rawStep = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  // The factor nearest the raw step, on a log scale, so the count stays close to `count`.
  const ratio = rawStep / power;
  const step =
    (ratio >= Math.sqrt(50) ? 10 : ratio >= Math.sqrt(10) ? 5 : ratio >= Math.SQRT2 ? 2 : 1) *
    power;
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step / 1e6; tick += step) {
    // Repeated additions drift (0.30000000000000004); the step's own digits are enough.
    ticks.push(Number(tick.toPrecision(12)));
  }
  return ticks;
}
