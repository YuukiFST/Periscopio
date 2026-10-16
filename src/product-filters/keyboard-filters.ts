import type { Product } from "../data/schema.ts";
import { enumValues, type FilterDefinition } from "./filter-engine.ts";
import { booleanChoice, enumChoice, enumValueChoices, numberChoice } from "./common-filters.ts";

const namedLayouts = ["tkl", "75%", "65%", "60%", "full", "96%"];

/**
 * EyeJoker's "하우징 소재" splits keyboards into aluminium, plastic, both, and
 * the rest; the data lists each material, so the set of materials decides.
 */
function housingIs(materials: readonly string[]): (product: Product) => boolean {
  return (product) => {
    const values = new Set(enumValues(product, "housingKeyboard"));
    return values.size === materials.length && materials.every((material) => values.has(material));
  };
}

/** EyeJoker's keyboard Filtros (`na` in its bundle), in its order. */
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
    buckets: enumValueChoices("connectionType", {
      유선: "com-fio",
      무선: "sem-fio",
      유무선: "com-e-sem-fio",
    }),
  },
  {
    kind: "buckets",
    param: "material",
    label: "Material da carcaça",
    buckets: [
      { id: "aluminio", label: "Alumínio", matches: housingIs(["aluminum"]) },
      { id: "plastico", label: "Plástico", matches: housingIs(["plastic"]) },
      {
        id: "aluminio-plastico",
        label: "Alumínio e plástico",
        matches: housingIs(["aluminum", "plastic"]),
      },
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
    kind: "buckets",
    param: "desempenho",
    label: "Desempenho real",
    buckets: [
      numberChoice("4000-ou-mais", "4.000 Hz ou mais", "realPerformance", (hz) => hz >= 4000),
      numberChoice(
        "2000-3999",
        "2.000 a 3.999 Hz",
        "realPerformance",
        (hz) => hz >= 2000 && hz < 4000,
      ),
      numberChoice(
        "1000-1999",
        "1.000 a 1.999 Hz",
        "realPerformance",
        (hz) => hz >= 1000 && hz < 2000,
      ),
      numberChoice("abaixo1000", "Menos de 1.000 Hz", "realPerformance", (hz) => hz < 1000),
    ],
  },
];
