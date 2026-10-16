/**
 * Flat, short search params (`ordem=-peso&status=testados&q=texto`) in place of
 * the router's JSON default: every value stays a string, so a typed `q=123`
 * is still the text "123", and each route's Zod schema decides what is valid.
 */
export function parseFlatSearch(searchText: string): Record<string, string> {
  const search: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(searchText)) {
    if (!Object.hasOwn(search, key)) search[key] = value;
  }
  return search;
}

export function stringifyFlatSearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string" && value !== "") params.set(key, value);
  }
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}
