import type { CategoryData, Field, Product } from "../data/schema.ts";
import { productFieldValue } from "../product-fields/field-groups.ts";
import { roundedAsShown } from "../product-table/cell-values.ts";
import { marksOfNumbers, type CellMark } from "./highlight-rules.ts";
import { fieldConnection, mouseConnections, type Connection } from "./mouse-connection.ts";

type NumberField = Extract<Field, { type: "number" }>;

export type ResponseMeasureId = "clique" | "sensor";
export type ResponseMeasure = { id: ResponseMeasureId; label: string };

/**
 * The board's time to send a click on each connection. The Fonte's headline
 * Resposta do clique (`optimalResponseSpeed`) also counts the switch and is
 * measured once, on its best setting, so it cannot follow a chosen connection.
 */
const clickBoardKeys: Record<Connection, string> = {
  "com fio": "pcbAvgWired",
  "sem fio": "pcbAvgWireless",
};
const sensorKeyPattern = /^sensorAvg/;

function measuresFor(connection: Connection | undefined): ResponseMeasure[] {
  return [
    {
      id: "clique",
      label: connection === undefined ? "Resposta do clique" : "Resposta do clique (ao pressionar)",
    },
    // The fastest of the sensor times, so it never shares a name with the Medição "Resposta do sensor".
    { id: "sensor", label: "Resposta mais rápida do sensor" },
  ];
}

/** True when the mouse has `connection` and no other, so its unnamed Medições were taken on it. */
function hasOnly(product: Product, connection: Connection): boolean {
  const connections = mouseConnections(product);
  return connections?.length === 1 && connections[0] === connection;
}

/**
 * The fields that measure `id` for `product`. With no connection chosen, the
 * clique is the headline time and the sensor any of its times; with one, only
 * the times taken on it.
 */
function candidateFields(
  id: ResponseMeasureId,
  fields: readonly NumberField[],
  product: Product,
  connection: Connection | undefined,
): NumberField[] {
  if (id === "clique") {
    if (connection === undefined) return fields.filter(({ key }) => key === "optimalResponseSpeed");
    const onlyThis = hasOnly(product, connection);
    return fields.filter(
      ({ key }) => key === clickBoardKeys[connection] || (onlyThis && key === "pcbAvgOptimal"),
    );
  }
  const sensorFields = fields.filter(({ key }) => sensorKeyPattern.test(key));
  if (connection === undefined) return sensorFields;
  const onlyThis = hasOnly(product, connection);
  return sensorFields.filter(({ key }) => {
    const measuredOn = fieldConnection(key);
    return measuredOn === connection || (onlyThis && measuredOn === undefined);
  });
}

/** A Produto's fastest time in one measure, as the screen rounds it. */
export type MeasuredResponse = {
  field: NumberField;
  value: number;
  /** Named when the field was measured on one connection. */
  connection: Connection | undefined;
};

/** The fastest of `fields` for `product`; a placeholder time never competes. */
function fastestResponse(
  product: Product,
  fields: readonly NumberField[],
): MeasuredResponse | undefined {
  let fastest: MeasuredResponse | undefined;
  for (const field of fields) {
    const raw = productFieldValue(product, field);
    if (typeof raw !== "number") continue;
    const value = roundedAsShown(field, raw);
    if (fastest && fastest.value <= value) continue;
    const measuredOn = fieldConnection(field.key);
    fastest = { field, value, connection: measuredOn === "bluetooth" ? undefined : measuredOn };
  }
  return fastest;
}

/**
 * Where a mouse stands in the Resumo: ranked, or why not. A mouse is ranked
 * only with every measure some compared mouse has, so one measure alone never
 * outranks a mouse measured on both.
 */
export type SummaryStanding =
  | { kind: "ranked"; score: number; place: number }
  | { kind: "incomplete" }
  | { kind: "unmeasured" }
  | { kind: "lacks-connection" };

export type ResponseSummaryRow = {
  product: Product;
  /** One per measure, in the order of `ResponseSummary.measures`. */
  responses: readonly (MeasuredResponse | undefined)[];
  standing: SummaryStanding;
};

export type ResponseSummary = {
  connection: Connection | undefined;
  measures: readonly ResponseMeasure[];
  /** One per compared Produto, in column order. */
  rows: readonly ResponseSummaryRow[];
  /** One mark per column, per measure. */
  measureMarks: readonly (readonly CellMark[])[];
  /** One mark per column, on the ranked mouses' scores. */
  scoreMarks: readonly CellMark[];
};

/**
 * A complete mouse's score: per measure, the fastest compared time over its
 * own (so the fastest scores 1), averaged and scaled to 100.
 */
function scoreOf(responses: readonly MeasuredResponse[], fastestByMeasure: readonly number[]) {
  const ratios = responses.map(
    (response, index) => (fastestByMeasure[index] ?? 0) / response.value,
  );
  return Math.round((100 * ratios.reduce((sum, ratio) => sum + ratio, 0)) / ratios.length);
}

function summaryFor(
  numberFields: readonly NumberField[],
  products: readonly Product[],
  connection: Connection | undefined,
): ResponseSummary {
  const measures = measuresFor(connection);
  const lacks = products.map(
    (product) =>
      connection !== undefined && mouseConnections(product)?.includes(connection) === false,
  );
  const responsesByProduct = products.map((product, position) =>
    measures.map(({ id }) =>
      lacks[position]
        ? undefined
        : fastestResponse(product, candidateFields(id, numberFields, product, connection)),
    ),
  );
  const valuesByMeasure = measures.map((_, index) =>
    responsesByProduct.map((responses) => responses[index]?.value),
  );
  // A measure no compared mouse has does not count against any of them.
  const measuredIndexes = valuesByMeasure.flatMap((values, index) =>
    values.some((value) => value !== undefined) ? [index] : [],
  );
  const fastestByMeasure = measuredIndexes.map((index) =>
    Math.min(...(valuesByMeasure[index] ?? []).filter((value) => value !== undefined)),
  );
  const scores = responsesByProduct.map((responses) => {
    const measured = measuredIndexes.map((index) => responses[index]);
    if (measured.length === 0 || measured.some((response) => response === undefined)) {
      return undefined;
    }
    return scoreOf(
      measured.filter((response) => response !== undefined),
      fastestByMeasure,
    );
  });
  const standings = scores.map((score, position): SummaryStanding => {
    if (lacks[position]) return { kind: "lacks-connection" };
    if (score !== undefined) {
      const place = 1 + scores.filter((other) => other !== undefined && other > score).length;
      return { kind: "ranked", score, place };
    }
    const hasAny = responsesByProduct[position]?.some((response) => response !== undefined);
    return { kind: hasAny ? "incomplete" : "unmeasured" };
  });
  return {
    connection,
    measures,
    rows: products.map((product, position) => ({
      product,
      responses: responsesByProduct[position] ?? [],
      standing: standings[position] ?? { kind: "unmeasured" },
    })),
    measureMarks: valuesByMeasure.map((values) => marksOfNumbers("lower", values)),
    scoreMarks: marksOfNumbers("higher", scores),
  };
}

export function rankedCount(summary: ResponseSummary): number {
  return summary.rows.filter(({ standing }) => standing.kind === "ranked").length;
}

const connectionChoices: readonly (Connection | undefined)[] = [undefined, "com fio", "sem fio"];

/**
 * The Resumo de desempenho of compared mouses on `connection` (any when
 * undefined): their fastest response times and a score that ranks them at a
 * glance. Undefined for other Categorias, and when no connection ranks any of
 * the mouses, so the connection choice shows wherever it can rank one.
 */
export function responseSummary(
  data: CategoryData,
  products: readonly Product[],
  connection: Connection | undefined,
): ResponseSummary | undefined {
  if (data.category !== "mouse") return undefined;
  const numberFields = data.fields.filter((field) => field.type === "number");
  const canRank = connectionChoices.some(
    (choice) => rankedCount(summaryFor(numberFields, products, choice)) > 0,
  );
  return canRank ? summaryFor(numberFields, products, connection) : undefined;
}
