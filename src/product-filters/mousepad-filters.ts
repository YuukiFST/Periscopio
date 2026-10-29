import type { FilterChoice, FilterDefinition } from "./filter-engine.ts";
import { enumValueChoices, ptValueLabel } from "./common-filters.ts";

/**
 * The Fonte writes the Perfil de deslize as Korean text: a pole ("브레이킹" for
 * control, "슬라이딩" for speed, each with an extreme "극" form) or the
 * balance, sometimes with a note after "·". A choice takes every text with
 * its word, so "극슬라이딩·끌림" answers Velocidade.
 */
function tendencyChoice(id: string, word: string): FilterChoice {
  return {
    id,
    label: ptValueLabel("tendency", word),
    matches: (product) => {
      const tendency = product.values.tendency;
      return typeof tendency === "string" && tendency.includes(word);
    },
  };
}

/** The mousepad Filtros: what the pad is made of, its size and how it glides. */
export const mousepadFilters: readonly FilterDefinition[] = [
  {
    kind: "buckets",
    param: "material",
    label: "Material",
    buckets: enumValueChoices("material", {
      천: "tecido",
      하이브리드: "hibrido",
      유리: "vidro",
      하드: "rigido",
      기타: "outro",
    }),
  },
  {
    kind: "buckets",
    param: "base",
    label: "Base",
    buckets: enumValueChoices("base", {
      고무: "borracha",
      포론: "poron",
      유리: "vidro",
      SCR: "scr",
    }),
  },
  { kind: "range", param: "largura", label: "Largura", fieldKey: "width", unit: "mm" },
  { kind: "range", param: "espessura", label: "Espessura", fieldKey: "thickness", unit: "mm" },
  {
    kind: "buckets",
    param: "perfil",
    label: "Perfil de deslize",
    buckets: [
      tendencyChoice("controle", "브레이킹"),
      tendencyChoice("equilibrado", "밸런스"),
      tendencyChoice("velocidade", "슬라이딩"),
    ],
  },
  {
    kind: "range",
    param: "atrito",
    label: "Atrito dinâmico",
    fieldKey: "dynamicFriction",
    unit: "μ",
  },
];
