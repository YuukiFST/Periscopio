import { isRatingField, ratingRank } from "../data/rating-order.ts";
import type { Field, FieldValue } from "../data/schema.ts";
import { isPlaceholderTime } from "../product-fields/field-groups.ts";
import { isCountEnum, roundedAsShown } from "../product-table/cell-values.ts";

/** Which way is better in a field: `none` means the field gets no Destaque. */
export type HighlightDirection = "lower" | "higher" | "none";

/**
 * EyeJoker field keys and the better direction ("Regras de destaque na
 * comparação"). A `*` stands for any text. Rules are read in order and the
 * first match wins, so the exact `none` keys come before the patterns that
 * would otherwise catch them (`detachStroke` before `detach*`).
 */
const directionRules: readonly (readonly [pattern: string, direction: HighlightDirection])[] = [
  // Unclear meaning, though a pattern below would match them.
  ["detachStroke", "none"],
  ["detachStrokeMeasured", "none"],
  ["slamClickPrevention", "none"],
  // Grades: the better grade ranks higher. ANTICIPATING has no rank, so it stays out.
  ["overallRating*", "higher"],
  ["eyejokerRating", "higher"],
  // Defects: `false` is better.
  ["clickGhosting", "lower"],
  ["slamClick", "lower"],
  ["multiKeyDelay", "lower"],
  ["keyGhosting", "lower"],
  // Higher is better.
  ["emWRealPerfD0", "higher"],
  ["solWRealPerf", "higher"],
  ["ips", "higher"],
  ["acceleration", "higher"],
  ["dpiMax", "higher"],
  ["maxPollingRate", "higher"],
  ["pollingRate", "higher"],
  ["pollingrateWireless", "higher"],
  ["realPerformance", "higher"],
  ["realPerformanceWireless", "higher"],
  ["effectiveUpdateRate", "higher"],
  ["refreshRate", "higher"],
  ["maxBrightness*", "higher"],
  ["bfiOnMaxBrightness", "higher"],
  ["hdrPeak*", "higher"],
  ["hdrFullFieldBrightnessMeasured", "higher"],
  ["colorGamut*", "higher"],
  ["colorVolume*", "higher"],
  ["contrastMeasured", "higher"],
  ["localDimmingZones", "higher"],
  ["pwmFrequencyMeasured", "higher"],
  ["buildQualityScore", "higher"],
  ["as", "higher"],
  ["battery", "higher"],
  // Times, delays and their standard deviations: lower is better.
  ["sensorAvg*", "lower"],
  ["sensorDeviation*", "lower"],
  ["optimalResponseSpeed", "lower"],
  ["optimalStddev", "lower"],
  ["debounce", "lower"],
  ["slamClickResponseSpeed", "lower"],
  ["slamClickPress*", "lower"],
  ["slamClickRelease*", "lower"],
  ["pcb*", "lower"],
  ["detach*", "lower"],
  ["overallResponseSpeed", "lower"],
  ["overallStddev", "lower"],
  ["key6*", "lower"],
  ["key10*", "lower"],
  ["debounceTime", "lower"],
  ["keyboardPcbAvg*", "lower"],
  ["stddev*", "lower"],
  ["keyboardDetach*", "lower"],
  ["bluetoothAvg", "lower"],
  ["bluetoothStddev", "lower"],
  ["emW*Rt*", "lower"],
  ["solW*Rt*", "lower"],
  ["responseAverage", "lower"],
  ["responseAverageRgb10", "lower"],
  ["responseMax", "lower"],
  ["inputLagMonitor", "lower"],
  // Other lower-is-better Especificações and Medições.
  ["weight", "lower"],
  ["lodMin", "lower"],
  ["clickPreTravel", "lower"],
  ["clickPostTravel", "lower"],
  ["clickRattle", "lower"],
  ["sidePreTravel", "lower"],
  ["sidePostTravel", "lower"],
  ["wheelLeeway", "lower"],
  ["sideFlex", "lower"],
  ["strokeErrorRate", "lower"],
  ["minStroke", "lower"],
  ["adjustmentUnit", "lower"],
  ["rapidAdjustmentUnit", "lower"],
  ["strokeMeasured", "lower"],
  ["strokeMeasuredStddev", "lower"],
  ["bottomDeadzone", "lower"],
  ["bottomDeadzoneStddev", "lower"],
  ["overshootAverage", "lower"],
  ["overshootMax", "lower"],
  ["colorDeAvg", "lower"],
  ["totalReflectanceMeasured", "lower"],
  ["diffuseReflectanceMeasured", "lower"],
];

function keyPattern(pattern: string): RegExp {
  const parts = pattern.split("*").map((part) => part.replaceAll(/[.+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${parts.join(".*")}$`);
}

const compiledRules = directionRules.map(
  ([pattern, direction]) => [keyPattern(pattern), direction] as const,
);

/** The better direction of a field; a key the table does not list, such as a new field, is `none`. */
export function highlightDirection(fieldKey: string): HighlightDirection {
  return compiledRules.find(([pattern]) => pattern.test(fieldKey))?.[1] ?? "none";
}

const amountLabelPattern = /^(\d+) ?[a-zA-Z]+$/;
const enumAmountValues = new WeakMap<Field, ReadonlySet<string>>();

/**
 * An ENUM value that is an amount: a bare count such as the polling rate
 * `8000`, or a number its label gives a unit, such as the battery's `500`
 * labelled `500mAh`. A value such as the battery's `AA` is not an amount.
 */
function enumAmount(field: Extract<Field, { type: "enum" }>, value: string): number | undefined {
  if (isCountEnum(field)) return /^\d+$/.test(value) ? Number(value) : undefined;
  let amounts = enumAmountValues.get(field);
  if (!amounts) {
    amounts = new Set(
      field.options.flatMap((option) =>
        option.label?.en.match(amountLabelPattern)?.[1] === option.value ? [option.value] : [],
      ),
    );
    enumAmountValues.set(field, amounts);
  }
  return amounts.has(value) ? Number(value) : undefined;
}

/** A value as a number to compare, undefined when it cannot compete. */
function comparableNumber(field: Field, value: FieldValue): number | undefined {
  switch (field.type) {
    case "number":
      if (typeof value !== "number" || isPlaceholderTime(field, value)) return undefined;
      return roundedAsShown(field, value);
    case "boolean":
      return typeof value === "boolean" ? Number(value) : undefined;
    case "enum":
      if (typeof value !== "string") return undefined;
      if (isRatingField(field.key)) return ratingRank(field.key, value);
      return enumAmount(field, value);
    case "text":
    case "date":
      return undefined;
  }
}

/**
 * How a Comparação marks one cell: `best` for a value tied at the best (the
 * Destaque), `tie` when every competing value is the same (the Empate).
 */
export type CellMark = "best" | "tie" | undefined;

/**
 * The mark of each position in `numbers`; an undefined number does not
 * compete. There is no mark unless at least two numbers compete.
 */
export function marksOfNumbers(
  direction: Exclude<HighlightDirection, "none">,
  numbers: readonly (number | undefined)[],
): readonly CellMark[] {
  const competing = numbers.filter((number) => number !== undefined);
  if (competing.length < 2) return numbers.map(() => undefined);
  const best = direction === "lower" ? Math.min(...competing) : Math.max(...competing);
  const worst = direction === "lower" ? Math.max(...competing) : Math.min(...competing);
  const markAtBest: CellMark = best === worst ? "tie" : "best";
  return numbers.map((number) => (number === best ? markAtBest : undefined));
}

/**
 * The mark of each of `values` (one per compared Produto), compared as the
 * screen rounds them. A missing value does not compete, and a field with no
 * better direction gets no mark. The Preço is not a field, so it never reaches here.
 */
export function comparisonMarks(
  field: Field,
  values: readonly (FieldValue | undefined)[],
): readonly CellMark[] {
  const direction = highlightDirection(field.key);
  if (direction === "none") return values.map(() => undefined);
  return marksOfNumbers(
    direction,
    values.map((value) => (value === undefined ? undefined : comparableNumber(field, value))),
  );
}
