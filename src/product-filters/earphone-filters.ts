import { booleanChoice, enumChoice, enumValueChoices, ptValueLabel } from "./common-filters.ts";
import type { FilterDefinition } from "./filter-engine.ts";

/**
 * The fone Filtros: how it connects and sits in the ear, then how well its
 * sound suits each game the Fonte scores.
 */
export const earphoneFilters: readonly FilterDefinition[] = [
  {
    kind: "buckets",
    param: "conexao",
    label: "Conexão",
    buckets: [
      enumChoice("com-fio", ptValueLabel("earphoneConnection", "WIRED"), "earphoneConnection", [
        "WIRED",
      ]),
      // True wireless has no cable at all, so it is Sem fio too.
      enumChoice("sem-fio", ptValueLabel("earphoneConnection", "WIRELESS"), "earphoneConnection", [
        "WIRELESS",
        "TRUE_WIRELESS",
      ]),
    ],
  },
  {
    kind: "buckets",
    param: "encaixe",
    label: "Encaixe",
    buckets: enumValueChoices("earphoneWearType", {
      OVER_EAR: "por-cima",
      UNDER_EAR: "por-baixo",
      OPEN_EAR: "earbud",
    }),
  },
  {
    kind: "options",
    param: "conector",
    label: "Conector no fone",
    fieldKey: "earphoneCableConnector",
  },
  {
    kind: "buckets",
    param: "microfone",
    label: "Microfone",
    // A fone sold with and without one answers Com microfone.
    buckets: enumValueChoices("earphoneMicrophone", { WITH_MIC: "com" }),
  },
  {
    kind: "buckets",
    param: "anc",
    label: "Cancelamento de ruído (ANC)",
    buckets: [
      booleanChoice("sim", "Sim", "earphoneAnc", true),
      booleanChoice("nao", "Não", "earphoneAnc", false),
    ],
  },
  {
    kind: "range",
    param: "valorant",
    label: "Adequação ao Valorant",
    fieldKey: "earphoneValorantFrMatch",
    unit: "%",
  },
  {
    kind: "range",
    param: "overwatch",
    label: "Adequação ao Overwatch",
    fieldKey: "earphoneOverwatchFrMatch",
    unit: "%",
  },
];
