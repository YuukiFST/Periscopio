/**
 * Every Filtro's name in the link, across all Categorias. A definition can
 * only use a name listed here, so two Filtros never fight over one param and
 * none collides with `ordem`, `status`, `q` or `cmp`.
 */
export const filterParams = [
  "nota",
  "recomendacao",
  "preco",
  "formato",
  "tamanho",
  "conexao",
  "peso",
  "ips",
  "furada",
  "sensor",
  "resposta-sensor",
  "clique",
  "layout",
  "material",
  "switch",
  "rapid-trigger",
  "atraso",
  "desempenho",
  "resolucao",
  "taxa",
  "resposta",
  "painel",
  "hdr",
  "iluminacao",
] as const;

export type FilterParam = (typeof filterParams)[number];
