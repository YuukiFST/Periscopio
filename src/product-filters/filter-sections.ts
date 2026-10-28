import type { CategorySlug } from "../categories.ts";
import type { CategoryFilter } from "./filter-engine.ts";
import type { FilterParam } from "./filter-params.ts";

type SectionDefinition = { title: string; params: readonly FilterParam[] };

/** The Filtros every Categoria opens with: what the Fonte rates and what it costs. */
const generalSection: SectionDefinition = {
  title: "Geral",
  params: ["nota", "recomendacao", "preco"],
};

/**
 * The Filtros panel in headed groups, always open: no Filtro is set apart as
 * advanced, the groups only make a long list scannable.
 */
const sectionDefinitions: Record<CategorySlug, readonly SectionDefinition[]> = {
  mouse: [
    generalSection,
    { title: "Construção", params: ["formato", "tamanho", "conexao", "peso", "furada"] },
    { title: "Desempenho", params: ["sensor", "resposta-sensor", "clique", "ips"] },
  ],
  teclado: [
    generalSection,
    { title: "Construção", params: ["layout", "material", "switch", "conexao"] },
    { title: "Desempenho", params: ["rapid-trigger", "atraso", "desempenho"] },
  ],
  monitor: [
    generalSection,
    { title: "Tela", params: ["tamanho", "resolucao", "painel", "taxa"] },
    { title: "Imagem", params: ["resposta", "hdr", "iluminacao"] },
  ],
};

/** A group's title: above the field labels in size, so the groups read as the panel's sections. */
export const filterSectionTitleClassName = "text-subtitle font-medium text-foreground";

export type FilterSection = { title: string; filters: CategoryFilter[] };

/**
 * The Categoria's Filtros sorted into its groups, in each group's order. A
 * Filtro no group names lands in a last "Outros" group, so none goes missing;
 * a group whose Filtros the data lacks is left out.
 */
export function filterSectionsFor(
  category: CategorySlug,
  filters: readonly CategoryFilter[],
): FilterSection[] {
  const byParam = new Map(filters.map((filter) => [filter.param, filter]));
  const sections = sectionDefinitions[category].map(({ title, params }) => ({
    title,
    filters: params.flatMap((param) => {
      const filter = byParam.get(param);
      byParam.delete(param);
      return filter ? [filter] : [];
    }),
  }));
  const rest = [...byParam.values()];
  if (rest.length > 0) sections.push({ title: "Outros", filters: rest });
  return sections.filter((section) => section.filters.length > 0);
}
