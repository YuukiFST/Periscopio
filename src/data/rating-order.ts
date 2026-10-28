/**
 * The Fonte's grades from worst to best, so a higher index is a better grade.
 * `ANTICIPATING` (no review yet) has no place in the recommendation order.
 */
const overallRatingOrder = [
  "UNRATED",
  "TIER_4",
  "TIER_3",
  "TIER_2",
  "TIER_1",
  "TIER_0",
  "FLAWLESS",
];
const eyejokerRatingOrder = [
  "NO_RECOMMENDATION",
  "MILD_RECOMMENDATION",
  "RECOMMENDED",
  "HIGHLY_RECOMMENDED",
];

/** The Fonte's letter grade for one quality, such as a fone's comfort, from worst to best. */
const letterGradeOrder = ["F", "E", "D", "C", "B", "A", "S"];

/** The fields the Fonte grades from S to F. */
export const letterGradeFieldKeys: ReadonlySet<string> = new Set([
  "earphoneComfort",
  "wobble",
  "skinFriction",
  "sleeveSideFrictionV",
  "sleeveSideFrictionH",
  "sleeveSideFrictionD",
  "uniformity",
  "gripForce",
  "stretch",
  "durability",
  "moistureProof",
]);

function gradeOrderOf(fieldKey: string): readonly string[] | undefined {
  if (fieldKey.startsWith("overallRating")) return overallRatingOrder;
  if (fieldKey === "eyejokerRating") return eyejokerRatingOrder;
  if (letterGradeFieldKeys.has(fieldKey)) return letterGradeOrder;
  return undefined;
}

/** Rank of a grade field's value, higher is better; undefined when it has none. */
export function ratingRank(fieldKey: string, value: string): number | undefined {
  const rank = gradeOrderOf(fieldKey)?.indexOf(value) ?? -1;
  return rank === -1 ? undefined : rank;
}

/** The Nota geral and the Recomendação, which lead a Produto's Especificações. */
export function isRatingField(fieldKey: string): boolean {
  return fieldKey.startsWith("overallRating") || fieldKey === "eyejokerRating";
}

/** A field whose values rank as grades: the Nota geral, the Recomendação or a letter grade. */
export function isGradeField(fieldKey: string): boolean {
  return gradeOrderOf(fieldKey) !== undefined;
}
