import { isRatingField } from "../data/rating-order.ts";
import type { CategoryData, Field, FieldValue, Product } from "../data/schema.ts";

export type ProductFieldGroupId = "especificacoes" | "medicoes";

/** One titled group of fields, in the order a Produto screen lists them. */
export type ProductFieldGroup = { id: ProductFieldGroupId; title: string; fields: Field[] };

function isOverallRating(field: Field): boolean {
  return field.key.startsWith("overallRating");
}

/** Shown with the name in the Produto header, so no group repeats it. */
const headerFieldKeys = new Set(["status"]);

/**
 * Each standard deviation EyeJoker publishes, by the average it measures the
 * spread of. Named one by one: the keys follow no single pattern
 * (`bottomDeadzoneStddev` sits after `initialDetach` in the field list).
 */
const deviationKeyByAverageKey: Record<string, string> = {
  sensorAvg: "sensorDeviationOpt",
  optimalResponseSpeed: "optimalStddev",
  pcbAvgOptimal: "pcbStddevOptimal",
  pcbAvgOptimalDetach: "pcbStddevOptimalDetach",
  pcbAvgWired: "pcbStddevWired",
  detachAvgWired: "detachStddevWired",
  sensorAvgWired: "sensorDeviationWired",
  pcbAvgWireless: "pcbStddevWireless",
  detachAvgWireless: "detachStddevWireless",
  sensorAvgWireless: "sensorDeviationWireless",
  pcbAvgBluetooth: "pcbStddevBluetooth",
  sensorAvgMotionSyncOn: "sensorDeviationMotionSyncOn",
  sensorAvgMotionSyncOff: "sensorDeviationMotionSyncOff",
  sensorAvgWiredMotionSyncOn: "sensorDeviationWiredMotionSyncOn",
  sensorAvgWiredMotionSyncOff: "sensorDeviationWiredMotionSyncOff",
  sensorAvgWirelessMotionSyncOn: "sensorDeviationWirelessMotionSyncOn",
  sensorAvgWirelessMotionSyncOff: "sensorDeviationWirelessMotionSyncOff",
  slamClickPressAvg: "slamClickPressStddev",
  slamClickReleaseAvg: "slamClickReleaseStddev",
  emWPrRtAvgD0: "emWPrRtSdD0",
  emWRlRtAvgD0: "emWRlRtSdD0",
  solWPrRtAvg: "solWPrRtSd",
  overallResponseSpeed: "overallStddev",
  key6PressResponseTime: "key6PressStandardDeviation",
  key6PullResponseTime: "key6PullStandardDeviation",
  key10PressResponseTime: "key10PressStandardDeviation",
  key10ResponseTime: "key10PullStandardDeviation",
  strokeMeasured: "strokeMeasuredStddev",
  bottomDeadzone: "bottomDeadzoneStddev",
  keyboardPcbAvgWired: "stddevWired",
  pcbAvgDetach: "stddevDetach",
  keyboardPcbAvgWireless: "stddevWireless",
  keyboardDetachAvgWireless: "keyboardDetachStddevWireless",
  bluetoothAvg: "bluetoothStddev",
};

const averageKeyByDeviationKey = new Map(
  Object.entries(deviationKeyByAverageKey).map(([average, deviation]) => [deviation, average]),
);

/** The field holding the standard deviation of `average`, when EyeJoker publishes one. */
export function deviationFieldOf(data: CategoryData, average: Field): Field | undefined {
  const key = deviationKeyByAverageKey[average.key];
  return key === undefined ? undefined : data.fields.find((field) => field.key === key);
}

/** The key of the average a standard deviation belongs to, when `field` is one. */
export function averageKeyOf(field: Field): string | undefined {
  return averageKeyByDeviationKey.get(field.key);
}

/**
 * True when `value` is EyeJoker's mark for a time it could not measure: -1
 * (`pcbAvgWired: -1`), or 0 on anything but a debounce, which a switch with
 * none really measures at 0 ms.
 */
export function isPlaceholderTime(field: Field, value: FieldValue): boolean {
  if (field.type !== "number" || field.unit !== "ms" || typeof value !== "number") return false;
  return value < 0 || (value === 0 && !/debounce/i.test(field.key));
}

/**
 * A Produto's value for a field. The pipeline keeps the Status de teste and
 * the situação de venda beside `values`; every other field lives in it. A
 * placeholder time is no value.
 */
export function productFieldValue(product: Product, field: Field): FieldValue | undefined {
  if (field.key === "status") return product.status ?? undefined;
  if (field.key === "saleStatus") return product.saleStatus ?? undefined;
  const value = product.values[field.key];
  return value === undefined || isPlaceholderTime(field, value) ? undefined : value;
}

/**
 * Especificações (EyeJoker's `common` and `spec` fields, grades first) and
 * Medições (its `bench` fields), each keeping only the fields at least one of
 * `products` has a value for, or listed in `keptKeys`; a group left without
 * fields is dropped.
 */
export function productFieldGroups(
  data: CategoryData,
  products: readonly Product[],
  keptKeys: ReadonlySet<string> = new Set(),
): ProductFieldGroup[] {
  const shown = data.fields.filter(
    (field) =>
      !headerFieldKeys.has(field.key) &&
      (keptKeys.has(field.key) ||
        products.some((product) => productFieldValue(product, field) !== undefined)),
  );
  // Nota geral before Recomendação, the order of the table's leading columns.
  const grades = shown
    .filter((field) => isRatingField(field.key))
    .toSorted((a, b) => Number(isOverallRating(b)) - Number(isOverallRating(a)));
  const declared = (group: Field["group"]) =>
    shown.filter((field) => field.group === group && !isRatingField(field.key));
  const groups: ProductFieldGroup[] = [
    {
      id: "especificacoes",
      title: "Especificações",
      fields: [...grades, ...declared("spec"), ...declared("common")],
    },
    { id: "medicoes", title: "Medições", fields: declared("bench") },
  ];
  return groups.filter((group) => group.fields.length > 0);
}
