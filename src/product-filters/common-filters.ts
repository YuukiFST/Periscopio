import { overallRatingKeys, type CategorySlug } from "../categories.ts";
import { valueLabelsPt } from "../i18n/pt-value-labels.ts";
import { priceOf } from "../product-table/cell-values.ts";
import {
  booleanValue,
  enumValues,
  type BucketsDefinition,
  type FilterChoice,
  type FilterDefinition,
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

/**
 * Com fio and Sem fio, each also matching the Fonte's "유무선" (cable and
 * receiver): a Produto that works both ways answers either choice, and
 * leaving both unmarked shows every Produto.
 */
export function connectionChoices(fieldKey: string): FilterChoice[] {
  return [
    enumChoice("com-fio", ptValueLabel(fieldKey, "유선"), fieldKey, ["유선", "유무선"]),
    enumChoice("sem-fio", ptValueLabel(fieldKey, "무선"), fieldKey, ["무선", "유무선"]),
  ];
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
  FLAWLESS: "s",
  TIER_0: "a-mais",
  TIER_1: "a",
  TIER_2: "b",
  TIER_3: "c",
  TIER_4: "d",
};

function overallRatingFilter(ratingKey: string): BucketsDefinition {
  return {
    kind: "buckets",
    param: "nota",
    label: "Nota geral",
    buckets: [
      ...enumValueChoices(ratingKey, ratingIds),
      {
        // The Fonte's "등급외" holds every grade outside S to D (its Impecável to Tier 4).
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
    HIGHLY_RECOMMENDED: "otima",
    RECOMMENDED: "boa",
    MILD_RECOMMENDATION: "fraca",
    NO_RECOMMENDATION: "evitar",
    ANTICIPATING: "pendente",
  }),
};

/**
 * Preço in thousands of won, so "50" is ₩ 50 mil and a typed "50.000" never
 * reads as ₩ 50; the Fonte leaves discontinued Produtos out of every price band.
 */
const priceFilter: FilterDefinition = {
  kind: "range",
  param: "preco",
  label: "Preço",
  unit: "mil ₩",
  readValue: (product) => {
    const price = priceOf(product);
    return price === undefined || product.saleStatus === "DISCONTINUED" ? undefined : price / 1000;
  },
};

/** Nota geral, Recomendação and Preço, in the Fonte's order. */
export function commonFilters(category: CategorySlug): FilterDefinition[] {
  return [overallRatingFilter(overallRatingKeys[category]), recommendationFilter, priceFilter];
}
