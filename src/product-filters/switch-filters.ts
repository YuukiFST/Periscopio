import { booleanChoice, enumValueChoices } from "./common-filters.ts";
import type { FilterDefinition } from "./filter-engine.ts";

/**
 * The switch Filtros: its kind and feel, then the forces and travel the Fonte
 * measures on every switch it tests.
 */
export const switchFilters: readonly FilterDefinition[] = [
  {
    kind: "buckets",
    param: "tipo",
    label: "Tipo",
    buckets: enumValueChoices("mechanism", { magnetic: "magnetico", mechanic: "mecanico" }),
  },
  {
    kind: "buckets",
    param: "sensacao",
    label: "Sensação",
    buckets: enumValueChoices("category", { 리니어: "linear", 택타일: "tatil", 클릭: "clicky" }),
  },
  {
    kind: "buckets",
    param: "batida-seca",
    label: "Batida seca no fim do curso",
    buckets: [
      booleanChoice("nao", "Não", "bottomOutHarshness", false),
      booleanChoice("sim", "Sim", "bottomOutHarshness", true),
    ],
  },
  {
    kind: "range",
    param: "forca-inicial",
    label: "Força inicial",
    fieldKey: "startingForce",
    unit: "gf",
  },
  {
    kind: "range",
    param: "forca-final",
    label: "Força no fim do curso",
    fieldKey: "bottomOutForce",
    unit: "gf",
  },
  { kind: "range", param: "curso", label: "Curso total", fieldKey: "travelDistance", unit: "mm" },
];
