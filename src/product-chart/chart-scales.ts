import { isGradeField } from "../data/rating-order.ts";
import { isCountEnum } from "../product-table/cell-values.ts";
import { axisValueText, type ChartAxis } from "./chart-axes.ts";
import { niceTicks, type ChartPoint } from "./chart-points.ts";

const tickFormat = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export type Tick = { value: number; text: string };

/**
 * Past this ratio between the largest and the smallest amount, a linear axis
 * crowds most Produtos into a corner (one ₩ 1,8 mi mouse leaves the rest in the
 * first fifth), so the axis spreads its amounts by order of magnitude instead.
 */
const logScaleRatio = 20;

function isRatingAxis(axis: ChartAxis): boolean {
  return axis.column.kind === "field" && isGradeField(axis.column.field.key);
}

/** An axis of a few separate values, a grade or a count, where many Produtos share each one. */
export function isStepAxis(axis: ChartAxis): boolean {
  return axis.column.kind === "field" && (isRatingAxis(axis) || isCountEnum(axis.column.field));
}

export function isLogAxis(axis: ChartAxis, values: readonly number[]): boolean {
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
export function ticksOf(
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
export function scaleOf(values: readonly number[], from: number, to: number, isLog: boolean) {
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

/** Widest a Produto strays from its step, in pixels, so the steps never run into each other. */
const maxSpread = 14;

/**
 * How far a step axis lets its dots stray to either side of their value, in
 * pixels: under a third of the gap between neighboring steps. 0 on any other axis.
 */
export function stepSpreadOf(
  axis: ChartAxis,
  values: readonly number[],
  pixelOf: (value: number) => number,
): number {
  if (!isStepAxis(axis)) return 0;
  const positions = [...new Set(values)].map(pixelOf).toSorted((a, b) => a - b);
  const gaps = positions.slice(1).map((position, index) => position - (positions[index] ?? 0));
  return gaps.length === 0 ? maxSpread : Math.min(maxSpread, Math.min(...gaps) * 0.3);
}

/**
 * Where in `[-1, 1]` a Produto strays from its step: the same place on every
 * render and every visit, picked from its id (FNV-1a), so no dot jumps around.
 */
export function strayOf(productId: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < productId.length; index++) {
    hash = Math.imul(hash ^ productId.charCodeAt(index), 0x01_00_01_93);
  }
  return ((hash >>> 0) / 0xff_ff_ff_ff) * 2 - 1;
}
