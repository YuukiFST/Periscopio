import type { Product } from "../data/schema.ts";
import { enumValues, type FilterChoice, type FilterDefinition } from "./filter-engine.ts";
import { enumChoice, numberChoice } from "./common-filters.ts";

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

/** EyeJoker's monitor Filtros (`ba` in its bundle), in its order. */
export const monitorFilters: readonly FilterDefinition[] = [
  {
    kind: "buckets",
    param: "tamanho",
    label: "Tamanho da tela",
    buckets: [
      numberChoice("ate23", 'Até 23"', "sizeInch", (inch) => inch >= 0 && inch <= 23.99),
      numberChoice("24-25", '24 a 25"', "sizeInch", (inch) => inch >= 24 && inch <= 25.99),
      numberChoice("27", '27"', "sizeInch", (inch) => inch >= 26 && inch <= 28.49),
      numberChoice("32", '32"', "sizeInch", (inch) => inch >= 31 && inch <= 33.49),
      numberChoice("34", '34"', "sizeInch", (inch) => inch >= 33.5 && inch <= 36.99),
      numberChoice("39", '39"', "sizeInch", (inch) => inch >= 38 && inch <= 40.99),
      numberChoice("45", '45"', "sizeInch", (inch) => inch >= 44 && inch <= 46.99),
      numberChoice("49-ou-mais", '49" ou mais', "sizeInch", (inch) => inch >= 48),
    ],
  },
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
    kind: "buckets",
    param: "taxa",
    label: "Taxa de atualização",
    buckets: [
      numberChoice("60-143", "60 a 143 Hz", "refreshRate", (hz) => hz >= 60 && hz <= 143),
      numberChoice("144-239", "144 a 239 Hz", "refreshRate", (hz) => hz >= 144 && hz <= 239),
      numberChoice("240-359", "240 a 359 Hz", "refreshRate", (hz) => hz >= 240 && hz <= 359),
      numberChoice("360-539", "360 a 539 Hz", "refreshRate", (hz) => hz >= 360 && hz <= 539),
      numberChoice("540-ou-mais", "540 Hz ou mais", "refreshRate", (hz) => hz >= 540),
    ],
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
