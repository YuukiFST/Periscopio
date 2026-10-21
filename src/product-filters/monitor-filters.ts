import type { Product } from "../data/schema.ts";
import { enumValues, type FilterChoice, type FilterDefinition } from "./filter-engine.ts";
import { enumChoice } from "./common-filters.ts";

/** EyeJoker's "와이드": every ultrawide resolution it groups together. */
const ultrawideResolutions = ["UWQHD", "DQHD", "DWQHD", "5K2K", "6K"];

/** EyeJoker's "TN류"…"OLED류": every panel whose type contains the family name. */
function panelFamilyChoice(id: string, family: string): FilterChoice {
  return {
    id,
    label: family,
    matches: (product: Product) =>
      enumValues(product, "panelType").some((value) => value.toUpperCase().includes(family)),
  };
}

/**
 * EyeJoker's monitor Filtros (`ba` in its bundle), in its order, with
 * Resposta geral after the Taxa de atualização. Screen size and refresh rate
 * take typed bounds instead of EyeJoker's bands.
 */
export const monitorFilters: readonly FilterDefinition[] = [
  { kind: "range", param: "tamanho", label: "Tamanho da tela", fieldKey: "sizeInch", unit: "pol." },
  {
    kind: "buckets",
    param: "resolucao",
    label: "Resolução",
    buckets: [
      enumChoice("fhd", "FHD (1920×1080)", "resolution", ["FHD"]),
      enumChoice("qhd", "QHD (2560×1440)", "resolution", ["QHD"]),
      enumChoice("uhd", "UHD (3840×2160)", "resolution", ["UHD"]),
      enumChoice("ultrawide", "Ultrawide", "resolution", ultrawideResolutions),
    ],
  },
  {
    kind: "range",
    param: "taxa",
    label: "Taxa de atualização",
    fieldKey: "refreshRate",
    unit: "Hz",
  },
  {
    kind: "range",
    param: "resposta",
    label: "Resposta geral",
    fieldKey: "responseAverage",
    unit: "ms",
  },
  {
    kind: "buckets",
    param: "painel",
    label: "Painel",
    buckets: [
      panelFamilyChoice("tn", "TN"),
      panelFamilyChoice("va", "VA"),
      panelFamilyChoice("ips", "IPS"),
      panelFamilyChoice("oled", "OLED"),
    ],
  },
  {
    kind: "buckets",
    param: "hdr",
    label: "Certificação HDR",
    buckets: [
      enumChoice("true-black-400", "True Black 400", "hdrCertification", [
        "displayHdrTrueBlack400",
      ]),
      enumChoice("true-black-500", "True Black 500", "hdrCertification", [
        "displayHdrTrueBlack500",
      ]),
      enumChoice("true-black-600", "True Black 600 ou mais", "hdrCertification", [
        "displayHdrTrueBlack600",
        "displayHdrTrueBlack1000",
      ]),
      enumChoice("displayhdr", "DisplayHDR comum", "hdrCertification", [
        "displayHdr400",
        "displayHdr500",
        "displayHdr600",
        "displayHdr1000",
        "displayHdr1400",
      ]),
    ],
  },
  {
    kind: "buckets",
    param: "iluminacao",
    label: "Escurecimento da retroiluminação",
    buckets: [enumChoice("mini-led", "Mini LED", "localDimmingType", ["miniLed"])],
  },
];
