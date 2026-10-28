import type { CategorySlug } from "../categories.ts";
import { isRatingField } from "../data/rating-order.ts";
import type { CategoryData, Field } from "../data/schema.ts";
import { fieldLabel } from "../i18n/labels.ts";
import { productFieldGroups, type ProductFieldGroupId } from "../product-fields/field-groups.ts";

/**
 * A column of the Categoria table. `slug` is its name in the link
 * (`ordem=-peso`); field columns show one Fonte field, with the standard
 * deviation beside the average where the Fonte shows one (`0,32 ms σ 0,05`).
 */
export type TableColumn =
  | { kind: "product"; slug: "produto" }
  | { kind: "price"; slug: "preco" }
  | { kind: "field"; slug: string; field: Field; deviation: Field | undefined };

/** Every column but the Produto one, which always comes first. */
type ChosenColumn = Exclude<TableColumn, { kind: "product" }>;

type ColumnSpec =
  | { kind: "price"; slug: "preco" }
  | { kind: "field"; slug: string; fieldKey: string; deviationKey?: string };

export type SortEntry = { slug: string; desc: boolean };

/** `columns` follow the Produto column. */
type CategoryTable = { columns: ColumnSpec[]; defaultSort: SortEntry[] };

const productColumn: TableColumn = { kind: "product", slug: "produto" };

function ratingAndPriceColumns(ratingKey: string): ColumnSpec[] {
  return [
    { kind: "field", slug: "nota", fieldKey: ratingKey },
    { kind: "field", slug: "recomendacao", fieldKey: "eyejokerRating" },
    { kind: "price", slug: "preco" },
  ];
}

/**
 * The columns the Fonte lists per Categoria, in its order (research file, 2026-10-16),
 * except the mouses' two response times: they matter most, so they follow the Produto
 * instead of closing a row too wide for a laptop. The Fonte's AliExpress column is left
 * out: a Produto with the link shows its name as that link instead.
 */
const categoryTables: Record<CategorySlug, CategoryTable> = {
  mouse: {
    columns: [
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

/** How `col=` names the Preço column; a field column goes by its field key (`col=weight`). */
const priceColumnKey = "preco";
/** `col=produto` asks for the Produto column alone, which shows with any choice. */
const productOnlyParam = "produto";

/** The key `col=` names a column by. */
function columnKeyOf(column: ChosenColumn): string {
  return column.kind === "price" ? priceColumnKey : column.field.key;
}

/** The Categoria's columns after the Produto, minus any field this version of the data lacks. */
function defaultTableColumns(data: CategoryData): ChosenColumn[] {
  const fieldsByKey = new Map(data.fields.map((field) => [field.key, field]));
  return categoryTables[data.category].columns.flatMap((spec): ChosenColumn[] => {
    if (spec.kind === "price") return [spec];
    const field = fieldsByKey.get(spec.fieldKey);
    if (!field) return [];
    const deviation = spec.deviationKey ? fieldsByKey.get(spec.deviationKey) : undefined;
    return [{ kind: "field", slug: spec.slug, field, deviation }];
  });
}

/**
 * The Produto column, then one per key in the given order. A default column
 * keeps its slug and its standard deviation; an added field column sorts by
 * its field key (`ordem=-batteryLife`). A key with no column is dropped, and
 * so is a field key another column already goes by in `ordem`.
 */
export function tableColumnsFor(data: CategoryData, columnKeys: readonly string[]): TableColumn[] {
  const defaults = defaultTableColumns(data);
  const defaultsByKey = new Map(defaults.map((column) => [columnKeyOf(column), column]));
  const defaultSlugs = new Set(defaults.map(({ slug }) => slug));
  const fieldsByKey = new Map(data.fields.map((field) => [field.key, field]));
  const chosen = [...new Set(columnKeys)].flatMap((key): ChosenColumn[] => {
    const column = defaultsByKey.get(key);
    if (column) return [column];
    const field = fieldsByKey.get(key);
    if (!field || defaultSlugs.has(key)) return [];
    return [{ kind: "field", slug: key, field, deviation: undefined }];
  });
  return [productColumn, ...chosen];
}

/** A column the "Colunas" menu offers. */
export type ColumnChoice = { key: string; label: string };
export type ColumnChoiceGroup = { id: ProductFieldGroupId; title: string; choices: ColumnChoice[] };

/**
 * The "Colunas" menu's groups, like the detail of a Produto: every field some
 * Produto of the Categoria has, each default column even while no Produto has
 * its value, and the Preço after the grades. `defaultKeys` are the columns
 * shown when nothing else is chosen; `availableKeys` every key `col=` takes.
 */
export type TableColumnChoices = {
  groups: ColumnChoiceGroup[];
  defaultKeys: string[];
  availableKeys: ReadonlySet<string>;
};

export function tableColumnChoicesFor(data: CategoryData): TableColumnChoices {
  const defaultKeys = defaultTableColumns(data).map(columnKeyOf);
  const groups = productFieldGroups(data, data.products, new Set(defaultKeys)).map((group) => {
    const choices = group.fields.map((field) => ({ key: field.key, label: fieldLabel(field) }));
    if (group.id === "especificacoes") {
      const gradeCount = group.fields.filter((field) => isRatingField(field.key)).length;
      choices.splice(gradeCount, 0, { key: priceColumnKey, label: "Preço" });
    }
    return { id: group.id, title: group.title, choices };
  });
  const availableKeys = new Set(groups.flatMap(({ choices }) => choices.map(({ key }) => key)));
  return { groups, defaultKeys, availableKeys };
}

/**
 * The column keys a `col=` text asks for, in its order: unknown and repeated
 * keys are dropped. Undefined when it names no column, so the table falls
 * back to the stored choice or the default.
 */
export function columnKeysFromParam(
  columnsParam: string | undefined,
  availableKeys: ReadonlySet<string>,
): string[] | undefined {
  if (columnsParam === undefined) return undefined;
  const parts = columnsParam.split(",");
  const keys = [...new Set(parts.filter((key) => availableKeys.has(key)))];
  if (keys.length === 0 && !parts.includes(productOnlyParam)) return undefined;
  return keys;
}

/** `col` for a choice of columns; undefined for the default one, so the link stays short. */
export function columnsParamOf(
  columnKeys: readonly string[],
  defaultKeys: readonly string[],
): string | undefined {
  if (columnKeys.join(",") === defaultKeys.join(",")) return undefined;
  return columnKeys.length === 0 ? productOnlyParam : columnKeys.join(",");
}

/** The Categoria's default sort, by those of its columns the table shows. */
export function defaultSortFor(
  category: CategorySlug,
  columns: readonly TableColumn[],
): SortEntry[] {
  const slugs = new Set(columns.map(({ slug }) => slug));
  return categoryTables[category].defaultSort.filter(({ slug }) => slugs.has(slug));
}
