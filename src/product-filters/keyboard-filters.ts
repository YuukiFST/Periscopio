import { enumValues, type FilterDefinition } from "./filter-engine.ts";
import {
  booleanChoice,
  connectionChoices,
  enumChoice,
  enumValueChoices,
} from "./common-filters.ts";

const namedLayouts = ["tkl", "75%", "65%", "60%", "full", "96%"];

/**
 * EyeJoker's keyboard Filtros (`na` in its bundle), in its order; Desempenho
 * real takes typed bounds instead of EyeJoker's bands.
 */
export const keyboardFilters: readonly FilterDefinition[] = [
  {
    kind: "buckets",
    param: "layout",
    label: "Layout",
    buckets: [
      enumChoice("tkl", "TKL", "keyboardLayout", ["tkl"]),
      enumChoice("75", "75%", "keyboardLayout", ["75%"]),
      enumChoice("65", "65%", "keyboardLayout", ["65%"]),
      enumChoice("60", "60%", "keyboardLayout", ["60%"]),
      enumChoice("completo", "Completo", "keyboardLayout", ["full"]),
      enumChoice("96", "96%", "keyboardLayout", ["96%"]),
      {
        id: "outro",
        label: "Outro",
        matches: (product) =>
          enumValues(product, "keyboardLayout").some((value) => !namedLayouts.includes(value)),
      },
    ],
  },
  {
    kind: "buckets",
    param: "conexao",
    label: "Conexão",
    buckets: connectionChoices("connectionType"),
  },
  {
    kind: "buckets",
    param: "material",
    label: "Material da carcaça",
    buckets: [
      // A housing of both materials answers either choice, like Conexão.
      enumChoice("aluminio", "Alumínio", "housingKeyboard", ["aluminum"]),
      enumChoice("plastico", "Plástico", "housingKeyboard", ["plastic"]),
      {
        id: "outro",
        label: "Outro",
        matches: (product) => {
          const values = enumValues(product, "housingKeyboard");
          return values.some((value) => value !== "aluminum" && value !== "plastic");
        },
      },
    ],
  },
  {
    kind: "buckets",
    param: "switch",
    label: "Tipo de switch",
    buckets: enumValueChoices("keyboardMechanism", {
      자석축: "magnetico",
      기계식: "mecanico",
      무접점: "capacitivo",
      광축: "optico",
      멤브레인: "membrana",
    }),
  },
  {
    kind: "buckets",
    param: "rapid-trigger",
    label: "Rapid trigger",
    buckets: [
      booleanChoice("sim", "Sim", "rapidTrigger", true),
      booleanChoice("nao", "Não", "rapidTrigger", false),
    ],
  },
  {
    kind: "buckets",
    param: "atraso",
    label: "Atraso com várias teclas",
    buckets: [
      booleanChoice("sem-atraso", "Sem atraso", "multiKeyDelay", false),
      booleanChoice("com-atraso", "Com atraso", "multiKeyDelay", true),
    ],
  },
  {
    kind: "range",
    param: "desempenho",
    label: "Desempenho real",
    fieldKey: "realPerformance",
    unit: "Hz",
  },
];
