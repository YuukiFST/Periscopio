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

/** Rank of a grade field's value, higher is better; undefined when it has none. */
export function ratingRank(fieldKey: string, value: string): number | undefined {
  const order = fieldKey.startsWith("overallRating")
    ? overallRatingOrder
    : fieldKey === "eyejokerRating"
      ? eyejokerRatingOrder
      : undefined;
  const rank = order?.indexOf(value) ?? -1;
  return rank === -1 ? undefined : rank;
}

export function isRatingField(fieldKey: string): boolean {
  return fieldKey.startsWith("overallRating") || fieldKey === "eyejokerRating";
}
