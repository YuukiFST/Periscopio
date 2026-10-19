import type { Product } from "../data/schema.ts";
import { numberValue, type FilterChoice, type FilterDefinition } from "./filter-engine.ts";
import { enumValueChoices } from "./common-filters.ts";

/** Volume of the bounding box in mm³, EyeJoker's measure of a mouse's size. */
function volumeOf(product: Product): number | undefined {
  const length = numberValue(product, "length");
  const width = numberValue(product, "maxWidth");
  const height = numberValue(product, "height");
  if (length === undefined || width === undefined || height === undefined) return undefined;
  return length * width * height;
}

function volumeChoice(
  id: string,
  label: string,
  inBand: (volume: number) => boolean,
): FilterChoice {
  return {
    id,
    label,
    matches: (product) => {
      const volume = volumeOf(product);
      return volume !== undefined && inBand(volume);
    },
  };
}

/**
 * EyeJoker's mouse Filtros (`_a` in its bundle), in its order, with Sensor and
 * Resposta do clique after Peso, all in one list: none is set apart as advanced.
 * Left out on purpose: the sensor class (the Sensor Filtro picks the sensors
 * themselves), the weight and IPS bands (both take typed bounds instead) and
 * "Depende do modelo" in Carcaça furada.
 */
export const mouseFilters: readonly FilterDefinition[] = [
  {
    kind: "buckets",
    param: "formato",
    label: "Formato",
    buckets: enumValueChoices("housingMouse", { 대칭: "simetrico", 비대칭: "assimetrico" }),
  },
  {
    kind: "buckets",
    param: "tamanho",
    label: "Tamanho",
    buckets: [
      volumeChoice("pequeno", "Pequeno", (volume) => volume <= 250_000),
      volumeChoice("medio", "Médio", (volume) => volume > 250_000 && volume <= 350_000),
      volumeChoice("grande", "Grande", (volume) => volume > 350_000),
    ],
  },
  {
    kind: "buckets",
    param: "conexao",
    label: "Conexão",
    buckets: enumValueChoices("mouseConnection", {
      유선: "com-fio",
      무선: "sem-fio",
      유무선: "com-e-sem-fio",
    }),
  },
  { kind: "range", param: "peso", label: "Peso", fieldKey: "weight", unit: "g" },
  { kind: "options", param: "sensor", label: "Sensor", fieldKey: "sensor" },
  {
    kind: "range",
    param: "clique",
    label: "Resposta do clique",
    fieldKey: "optimalResponseSpeed",
    unit: "ms",
  },
  {
    kind: "range",
    param: "ips",
    label: "Velocidade máxima de rastreio",
    fieldKey: "ips",
    unit: "IPS",
  },
  {
    kind: "buckets",
    param: "furada",
    label: "Carcaça furada",
    buckets: enumValueChoices("holeBody", {
      yes: "sim",
      no: "nao",
      yesBottom: "so-embaixo",
    }),
  },
];
