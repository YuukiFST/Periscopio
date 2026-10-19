import { z } from "zod";

/** A Comparação holds 2 to 4 Produtos of one Categoria. */
export const maxComparedProducts = 4;
export const minComparedProducts = 2;

const productIdSchema = z.guid();

/**
 * The Produto ids of a link list (`cmp=<id>,<id>` on the table, `p=` on the
 * Comparação), in their order, without repeats; text that is not an id is
 * dropped.
 */
export function productIdsFromParam(text: string | undefined): string[] {
  if (text === undefined) return [];
  const ids = text.split(",").filter((id) => productIdSchema.safeParse(id).success);
  return [...new Set(ids)];
}

/** The link list of `ids`, undefined when empty so the param leaves the link. */
export function productIdsParam(ids: readonly string[]): string | undefined {
  return ids.length > 0 ? ids.join(",") : undefined;
}

/** Long enough for 4 ids, short enough that a pasted link cannot carry a novel. */
export const compareParamSchema = z.string().max(1000).optional().catch(undefined);

/** The Produtos marked on the table, kept to those `knownIds` has and to the first 4. */
export function comparedIdsFromParam(
  text: string | undefined,
  knownIds: ReadonlySet<string>,
): string[] {
  return productIdsFromParam(text)
    .filter((id) => knownIds.has(id))
    .slice(0, maxComparedProducts);
}

/** `ids` with `id` marked or unmarked; a fifth mark is refused. */
export function toggleComparedId(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((candidate) => candidate !== id);
  return ids.length < maxComparedProducts ? [...ids, id] : [...ids];
}
