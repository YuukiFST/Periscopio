import { z } from "zod";
import { compareParamSchema } from "@/product-compare/compare-selection";
import { pickFilterSearch } from "@/product-filters/filter-link";
import { testStatusFilters } from "@/product-table/product-filter";
import { sortParamPattern } from "@/product-table/table-sorting";
import { searchTextMaxLength } from "@/product-table/table-toolbar";

/** Every param falls back to "absent" on its own, so a broken link still opens. */
const categorySearchSchema = z.object({
  ordem: z.string().regex(sortParamPattern).optional().catch(undefined),
  status: z.enum(testStatusFilters).optional().catch(undefined),
  q: z.string().max(searchTextMaxLength).optional().catch(undefined),
  cmp: compareParamSchema,
  novidades: z.literal("1").optional().catch(undefined),
  // Unknown keys are dropped later, one by one, against the Categoria's fields.
  col: z.string().optional().catch(undefined),
});

/**
 * The Categoria table's search params: its Filtros, Status de teste, busca,
 * ordem and columns. Filtro params stay raw text here: only the Categoria's
 * Filtros know which values are valid.
 */
export function validateTableSearch(search: Record<string, unknown>) {
  return { ...categorySearchSchema.parse(search), ...pickFilterSearch(search) };
}

export type TableSearch = ReturnType<typeof validateTableSearch>;
