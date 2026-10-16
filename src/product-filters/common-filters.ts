import type { CategorySlug } from "../categories.ts";
import { valueLabelsPt } from "../i18n/pt-value-labels.ts";
import { priceOf } from "../product-table/cell-values.ts";
import {
  booleanValue,
  enumValues,
  numberValue,
  type BucketsDefinition,
  type FilterChoice,
} from "./filter-engine.ts";

/** The pt label of one ENUM value, as the table shows it. */
export function ptValueLabel(fieldKey: string, value: string): string {
  return valueLabelsPt[fieldKey]?.[value] ?? value;
}

/** A choice that matches Produtos holding any of `values` in an ENUM field. */
export function enumChoice(
  id: string,
  label: string,
  fieldKey: string,
  values: readonly string[],
): FilterChoice {
  return {
    id,
    label,
    matches: (product) => enumValues(product, fieldKey).some((value) => values.includes(value)),
  };
}

/** A choice per ENUM value, labelled in pt. */
export function enumValueChoices(
  fieldKey: string,
  idsByValue: Readonly<Record<string, string>>,
): FilterChoice[] {
  return Object.entries(idsByValue).map(([value, id]) =>
    enumChoice(id, ptValueLabel(fieldKey, value), fieldKey, [value]),
  );
}

/** A choice for a band of a number field, its bounds written as EyeJoker's predicate. */
export function numberChoice(
  id: string,
  label: string,
  fieldKey: string,
  inBand: (value: number) => boolean,
): FilterChoice {
  return {
    id,
    label,
    matches: (product) => {
      const value = numberValue(product, fieldKey);
      return value !== undefined && inBand(value);
    },
  };
}

export function booleanChoice(
  id: string,
  label: string,
  fieldKey: string,
  expected: boolean,
): FilterChoice {
  return { id, label, matches: (product) => booleanValue(product, fieldKey) === expected };
}

const gradedRatings = ["FLAWLESS", "TIER_0", "TIER_1", "TIER_2", "TIER_3", "TIER_4"];
const ratingIds: Readonly<Record<string, string>> = {
  FLAWLESS: "impecavel",
  TIER_0: "tier0",
  TIER_1: "tier1",
  TIER_2: "tier2",
  TIER_3: "tier3",
  TIER_4: "tier4",
};

function overallRatingFilter(ratingKey: string): BucketsDefinition {
  return {
    kind: "buckets",
    param: "nota",
    label: "Nota geral",
    buckets: [
      ...enumValueChoices(ratingKey, ratingIds),
      {
        // EyeJoker's "등급외" holds every grade outside Impecável to Tier 4.
        id: "sem-nota",
        label: ptValueLabel(ratingKey, "UNRATED"),
        matches: (product) =>
          enumValues(product, ratingKey).some((value) => !gradedRatings.includes(value)),
      },
    ],
  };
}

const recommendationFilter: BucketsDefinition = {
  kind: "buckets",
  param: "recomendacao",
  label: "Recomendação",
  buckets: enumValueChoices("eyejokerRating", {
    ANTICIPATING: "aguardado",
    HIGHLY_RECOMMENDED: "muito-recomendado",
    RECOMMENDED: "recomendado",
    MILD_RECOMMENDATION: "recomendacao-fraca",
    NO_RECOMMENDATION: "nao-recomendado",
  }),
};

/** EyeJoker leaves discontinued Produtos out of every price band. */
function priceChoice(
  id: string,
  label: string,
  inBand: (priceKrw: number) => boolean,
): FilterChoice {
  return {
    id,
    label,
    matches: (product) => {
      const price = priceOf(product);
      return price !== undefined && product.saleStatus !== "DISCONTINUED" && inBand(price);
    },
  };
}

const priceBuckets: Record<"accessory" | "monitor", FilterChoice[]> = {
  accessory: [
    priceChoice("ate50mil", "Até ₩ 50 mil", (price) => price <= 50_000),
    priceChoice("50-100mil", "₩ 50 a 100 mil", (price) => price > 50_000 && price <= 100_000),
    priceChoice("100-200mil", "₩ 100 a 200 mil", (price) => price > 100_000 && price <= 200_000),
    priceChoice("acima200mil", "Mais de ₩ 200 mil", (price) => price > 200_000),
  ],
  monitor: [
    priceChoice("ate200mil", "Até ₩ 200 mil", (price) => price <= 200_000),
    priceChoice("200-400mil", "₩ 200 a 400 mil", (price) => price > 200_000 && price <= 400_000),
    priceChoice("400-600mil", "₩ 400 a 600 mil", (price) => price > 400_000 && price <= 600_000),
    priceChoice("600mil-1mi", "₩ 600 mil a 1 mi", (price) => price > 600_000 && price <= 1_000_000),
    priceChoice("acima1mi", "Mais de ₩ 1 mi", (price) => price > 1_000_000),
  ],
};

const overallRatingKeys: Record<CategorySlug, string> = {
  mouse: "overallRatingMouse",
  teclado: "overallRatingKeyboard",
  monitor: "overallRatingMonitor",
};

/** Nota geral, Recomendação and Preço, in EyeJoker's order. */
export function commonFilters(category: CategorySlug): BucketsDefinition[] {
  return [
    overallRatingFilter(overallRatingKeys[category]),
    recommendationFilter,
    {
      kind: "buckets",
      param: "preco",
      label: "Preço",
      buckets: priceBuckets[category === "monitor" ? "monitor" : "accessory"],
    },
  ];
}
