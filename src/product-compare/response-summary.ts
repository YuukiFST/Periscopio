import type { CategoryData, Field, Product } from "../data/schema.ts";
import { roundedAsShown } from "../product-table/cell-values.ts";
import { marksOfNumbers, type ComparisonMarks } from "./highlight-rules.ts";

type NumberField = Extract<Field, { type: "number" }>;

/** A response time of the Resumo de desempenho, read from the fields that measure it. */
export type ResponseMeasure = { id: string; label: string; fieldKeys: readonly string[] };

/**
 * The mouse response times, lower is better. The Resposta do clique is
 * already EyeJoker's best setting; the board times (`pcbAvg*`) measure another
 * stage of the click, so they stay out. The Resposta do sensor is measured per
 * connection and with Motion Sync on or off, so its fastest one counts.
 */
const mouseResponseMeasures: readonly ResponseMeasure[] = [
  { id: "clique", label: "Clique", fieldKeys: ["optimalResponseSpeed"] },
  {
    id: "sensor",
    label: "Sensor",
    fieldKeys: [
      "sensorAvg",
      "sensorAvgWired",
      "sensorAvgWireless",
      "sensorAvgMotionSyncOn",
      "sensorAvgMotionSyncOff",
      "sensorAvgWiredMotionSyncOn",
      "sensorAvgWiredMotionSyncOff",
      "sensorAvgWirelessMotionSyncOn",
      "sensorAvgWirelessMotionSyncOff",
    ],
  },
];

/** A Produto's fastest time in one measure, with the connection it was measured on when the field says. */
export type MeasuredResponse = {
  field: NumberField;
  value: number;
  connection: "com fio" | "sem fio" | undefined;
};

export type ResponseSummaryRow = {
  product: Product;
  /** One per measure, in the order of `ResponseSummary.measures`. */
  responses: readonly (MeasuredResponse | undefined)[];
  /** 0 to 100; undefined when the Produto has none of the measures. */
  score: number | undefined;
};

export type ResponseSummary = {
  measures: readonly ResponseMeasure[];
  /** One per compared Produto, in column order. */
  rows: readonly ResponseSummaryRow[];
  /** One per measure; positions are column positions. */
  measureMarks: readonly ComparisonMarks[];
  scoreMarks: ComparisonMarks;
};

function connectionOf(fieldKey: string): MeasuredResponse["connection"] {
  if (fieldKey.includes("Wireless")) return "sem fio";
  if (fieldKey.includes("Wired")) return "com fio";
  return undefined;
}

function fastestResponse(
  product: Product,
  fields: readonly NumberField[],
): MeasuredResponse | undefined {
  let fastest: MeasuredResponse | undefined;
  for (const field of fields) {
    const value = product.values[field.key];
    if (typeof value !== "number" || (fastest && fastest.value <= value)) continue;
    fastest = { field, value, connection: connectionOf(field.key) };
  }
  return fastest;
}

/**
 * Each Produto's score: for every measure it has, how close it gets to the
 * fastest compared Produto (the fastest time over its own, so the fastest
 * scores 1), averaged and scaled to 100. A measure it lacks is left out of
 * its average, not counted as 0.
 */
function scoreOf(
  responses: readonly (MeasuredResponse | undefined)[],
  fastestByMeasure: readonly (number | undefined)[],
): number | undefined {
  const ratios = responses.flatMap((response, index) => {
    const fastest = fastestByMeasure[index];
    if (response === undefined || fastest === undefined) return [];
    return [response.value <= 0 ? 1 : fastest / response.value];
  });
  if (ratios.length === 0) return undefined;
  return Math.round((100 * ratios.reduce((sum, ratio) => sum + ratio, 0)) / ratios.length);
}

/**
 * The Resumo de desempenho of compared mouses: their fastest response times,
 * whatever the connection, and a score that ranks them at a glance. Undefined
 * for other Categorias and when fewer than two Produtos have a measure.
 */
export function responseSummary(
  data: CategoryData,
  products: readonly Product[],
): ResponseSummary | undefined {
  if (data.category !== "mouse") return undefined;
  const fieldsByKey = new Map(data.fields.map((field) => [field.key, field]));
  const measures = mouseResponseMeasures.flatMap((measure) => {
    const fields = measure.fieldKeys.flatMap((key) => {
      const field = fieldsByKey.get(key);
      return field?.type === "number" ? [field] : [];
    });
    return fields.length > 0 ? [{ measure, fields }] : [];
  });
  const responsesByProduct = products.map((product) =>
    measures.map(({ fields }) => fastestResponse(product, fields)),
  );
  const fastestByMeasure = measures.map((_, index) => {
    const values = responsesByProduct.flatMap((responses) => {
      const response = responses[index];
      return response ? [response.value] : [];
    });
    return values.length > 0 ? Math.min(...values) : undefined;
  });
  const rows = products.map((product, position) => {
    const responses = responsesByProduct[position] ?? [];
    return { product, responses, score: scoreOf(responses, fastestByMeasure) };
  });
  const scored = rows.flatMap(({ score }, position) =>
    score === undefined ? [] : [{ position, number: score }],
  );
  if (scored.length < 2) return undefined;
  const measureMarks = measures.map((_, index) =>
    marksOfNumbers(
      "lower",
      rows.flatMap(({ responses }, position) => {
        const response = responses[index];
        return response
          ? [{ position, number: roundedAsShown(response.field, response.value) }]
          : [];
      }),
    ),
  );
  return {
    measures: measures.map(({ measure }) => measure),
    rows,
    measureMarks,
    scoreMarks: marksOfNumbers("higher", scored),
  };
}
