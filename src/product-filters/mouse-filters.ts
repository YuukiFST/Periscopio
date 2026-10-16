import type { Product } from "../data/schema.ts";
import { numberValue, type FilterChoice, type FilterDefinition } from "./filter-engine.ts";
import { enumValueChoices, numberChoice } from "./common-filters.ts";
import { sensorClassOf, type SensorClass } from "./sensor-class.ts";

const sensorClassChoices: readonly { sensorClass: SensorClass; id: string; label: string }[] = [
  { sensorClass: "focus-pro-50k", id: "focus-pro-50k", label: "Focus Pro 50K" },
  { sensorClass: "flagship", id: "topo", label: "Topo de linha atual" },
  { sensorClass: "high-end", id: "alto", label: "Alto desempenho" },
  { sensorClass: "mid-range", id: "intermediario", label: "Intermediário ou topo antigo" },
  { sensorClass: "entry", id: "basico", label: "Básico ou antigo" },
  { sensorClass: "legacy", id: "simples", label: "Simples ou especial" },
];

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

/** EyeJoker's mouse Filtros (`_a` in its bundle), in its order; the last three are advanced. */
export const mouseFilters: readonly FilterDefinition[] = [
  {
    kind: "buckets",
    param: "formato",
    label: "Formato",
    buckets: enumValueChoices("housingMouse", { 대칭: "simetrico", 비대칭: "assimetrico" }),
  },
  {
    kind: "buckets",
    param: "classe",
    label: "Classe do sensor",
    buckets: sensorClassChoices.map(({ sensorClass, id, label }) => ({
      id,
      label,
      matches: (product) => sensorClassOf(product) === sensorClass,
    })),
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
  {
    kind: "buckets",
    param: "peso",
    label: "Peso",
    buckets: [
      numberChoice("ate50", "Até 50 g", "weight", (grams) => grams <= 50),
      numberChoice("50-60", "50 a 60 g", "weight", (grams) => grams > 50 && grams <= 60),
      numberChoice("60-80", "60 a 80 g", "weight", (grams) => grams > 60 && grams <= 80),
      numberChoice("80-100", "80 a 100 g", "weight", (grams) => grams > 80 && grams <= 100),
      numberChoice("acima100", "Mais de 100 g", "weight", (grams) => grams > 100),
    ],
  },
  {
    kind: "buckets",
    param: "ips",
    label: "Velocidade máxima de rastreio",
    advanced: true,
    buckets: [
      numberChoice("ate300", "Até 300 IPS", "ips", (ips) => ips >= 0 && ips <= 300),
      numberChoice("301-499", "301 a 499 IPS", "ips", (ips) => ips >= 301 && ips <= 499),
      numberChoice("500-749", "500 a 749 IPS", "ips", (ips) => ips >= 500 && ips <= 749),
      numberChoice("750-ou-mais", "750 IPS ou mais", "ips", (ips) => ips >= 750),
    ],
  },
  {
    kind: "buckets",
    param: "furada",
    label: "Carcaça furada",
    advanced: true,
    buckets: enumValueChoices("holeBody", {
      yes: "sim",
      no: "nao",
      yesBottom: "so-embaixo",
      yesModel: "depende-do-modelo",
    }),
  },
  {
    kind: "range",
    param: "gramas",
    label: "Faixa de peso",
    advanced: true,
    fieldKey: "weight",
    unit: "g",
  },
];
