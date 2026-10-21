import { isRatingField, ratingRank } from "../data/rating-order.ts";
import type { Field, FieldValue } from "../data/schema.ts";
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

/**
 * An ENUM value that is an amount: a bare count such as the polling rate
 * `8000`, or a number its label gives a unit, such as the battery's `500`
 * labelled `500mAh`. A value such as the battery's `AA` is not an amount.
 */
function enumAmount(field: Extract<Field, { type: "enum" }>, value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  if (isCountEnum(field)) return Number(value);
  const label = field.options.find((option) => option.value === value)?.label?.en;
  return label !== undefined && new RegExp(`^${value} ?[a-zA-Z]+$`).test(label)
    ? Number(value)
    : undefined;
}

/** A value as a number to compare, undefined when it cannot compete. */
function comparableNumber(field: Field, value: FieldValue): number | undefined {
  switch (field.type) {
    case "number":
      return typeof value === "number" ? roundedAsShown(field, value) : undefined;
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
 * How a Comparação marks one field's row: `best` for the positions tied at the
 * best value (the Destaque), `tie` for every competing position when all of
 * them show the same value (the Empate), and `none` otherwise.
 */
export type ComparisonMarks =
  | { kind: "none" }
  | { kind: "best" | "tie"; positions: ReadonlySet<number> };

const noMarks: ComparisonMarks = { kind: "none" };

/**
 * The marks of numbers that compete, by position. There is no mark unless at
 * least two numbers compete.
 */
export function marksOfNumbers(
  direction: Exclude<HighlightDirection, "none">,
  competing: readonly { position: number; number: number }[],
): ComparisonMarks {
  if (competing.length < 2) return noMarks;
  const numbers = competing.map(({ number }) => number);
  const best = direction === "lower" ? Math.min(...numbers) : Math.max(...numbers);
  const worst = direction === "lower" ? Math.max(...numbers) : Math.min(...numbers);
  const positionsAt = (target: number) =>
    new Set(competing.flatMap(({ position, number }) => (number === target ? [position] : [])));
  return best === worst
    ? { kind: "tie", positions: positionsAt(best) }
    : { kind: "best", positions: positionsAt(best) };
}

/**
 * The marks of `values` (one per compared Produto), compared as the screen
 * rounds them. A missing value does not compete, and a field with no better
 * direction gets no mark. The Preço is not a field, so it never reaches here.
 */
export function comparisonMarks(
  field: Field,
  values: readonly (FieldValue | undefined)[],
): ComparisonMarks {
  const direction = highlightDirection(field.key);
  if (direction === "none") return noMarks;
  const competing = values.flatMap((value, position) => {
    const number = value === undefined ? undefined : comparableNumber(field, value);
    return number === undefined ? [] : [{ position, number }];
  });
  return marksOfNumbers(direction, competing);
}
