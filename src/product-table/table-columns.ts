import type { CategorySlug } from "../categories.ts";
import type { CategoryData, Field } from "../data/schema.ts";

/**
 * A column of the Categoria table. `slug` is its name in the link
 * (`ordem=-peso`); field columns show one EyeJoker field, with the standard
 * deviation beside the average where EyeJoker shows one (`0,32 ms σ 0,05`).
 */
export type ColumnSpec =
  | { kind: "product"; slug: "produto" }
  | { kind: "price"; slug: "preco" }
  | { kind: "field"; slug: string; fieldKey: string; deviationKey?: string };

export type TableColumn =
  | Exclude<ColumnSpec, { kind: "field" }>
  | { kind: "field"; slug: string; field: Field; deviation: Field | undefined };

export type SortEntry = { slug: string; desc: boolean };

type CategoryTable = { columns: ColumnSpec[]; defaultSort: SortEntry[] };

const productColumn: ColumnSpec = { kind: "product", slug: "produto" };

function ratingAndPriceColumns(ratingKey: string): ColumnSpec[] {
  return [
    { kind: "field", slug: "nota", fieldKey: ratingKey },
    { kind: "field", slug: "recomendacao", fieldKey: "eyejokerRating" },
    { kind: "price", slug: "preco" },
  ];
}

/**
 * The columns EyeJoker lists per Categoria, in its order (research file, 2026-10-16),
 * except the mouses' two response times: they matter most, so they follow the Produto
 * instead of closing a row too wide for a laptop. EyeJoker's AliExpress column is left
 * out: a Produto with the link shows its name as that link instead.
 */
const categoryTables: Record<CategorySlug, CategoryTable> = {
  mouse: {
    columns: [
      productColumn,
      {
        kind: "field",
        slug: "resposta-sensor",
        fieldKey: "sensorAvg",
        deviationKey: "sensorDeviationOpt",
      },
      {
        kind: "field",
        slug: "clique",
        fieldKey: "optimalResponseSpeed",
        deviationKey: "optimalStddev",
      },
      ...ratingAndPriceColumns("overallRatingMouse"),
      { kind: "field", slug: "sensor", fieldKey: "sensor" },
      { kind: "field", slug: "mcu", fieldKey: "mouseMcu" },
      { kind: "field", slug: "formato", fieldKey: "housingMouse" },
      { kind: "field", slug: "peso", fieldKey: "weight" },
    ],
    defaultSort: [{ slug: "nota", desc: true }],
  },
  teclado: {
    columns: [
      productColumn,
      ...ratingAndPriceColumns("overallRatingKeyboard"),
      {
        kind: "field",
        slug: "resposta",
        fieldKey: "overallResponseSpeed",
        deviationKey: "overallStddev",
      },
      { kind: "field", slug: "desempenho", fieldKey: "realPerformance" },
      { kind: "field", slug: "polling", fieldKey: "effectiveUpdateRate" },
      { kind: "field", slug: "acionamento", fieldKey: "strokeMeasured" },
      { kind: "field", slug: "zona-morta", fieldKey: "bottomDeadzone" },
      { kind: "field", slug: "erro-curso", fieldKey: "strokeErrorRate" },
    ],
    defaultSort: [{ slug: "nota", desc: true }],
  },
  monitor: {
    columns: [
      productColumn,
      ...ratingAndPriceColumns("overallRatingMonitor"),
      { kind: "field", slug: "tamanho", fieldKey: "sizeInch" },
      { kind: "field", slug: "taxa", fieldKey: "refreshRate" },
      { kind: "field", slug: "resolucao", fieldKey: "resolution" },
      { kind: "field", slug: "hdr", fieldKey: "hdrCertification" },
      { kind: "field", slug: "resposta", fieldKey: "responseAverage" },
      { kind: "field", slug: "gama", fieldKey: "colorGamutDciP3Measured" },
      { kind: "field", slug: "brilho-sdr", fieldKey: "maxBrightnessSdrMeasured" },
      { kind: "field", slug: "brilho-hdr", fieldKey: "maxBrightnessHdrMeasured" },
      { kind: "field", slug: "reflexao", fieldKey: "totalReflectanceMeasured" },
    ],
    defaultSort: [
      { slug: "nota", desc: true },
      { slug: "resposta", desc: false },
    ],
  },
};

/** The Categoria's columns, minus any field this version of the data lacks. */
export function tableColumnsFor(data: CategoryData): TableColumn[] {
  const fieldsByKey = new Map(data.fields.map((field) => [field.key, field]));
  return categoryTables[data.category].columns.flatMap((spec): TableColumn[] => {
    if (spec.kind !== "field") return [spec];
    const field = fieldsByKey.get(spec.fieldKey);
    if (!field) return [];
    const deviation = spec.deviationKey ? fieldsByKey.get(spec.deviationKey) : undefined;
    return [{ kind: "field", slug: spec.slug, field, deviation }];
  });
}

export function defaultSortFor(category: CategorySlug): SortEntry[] {
  return categoryTables[category].defaultSort;
}
