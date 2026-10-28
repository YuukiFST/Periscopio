export const categorySlugs = ["mouse", "teclado", "monitor", "mousepad", "switch", "fone"] as const;

export type CategorySlug = (typeof categorySlugs)[number];

export const categoryLabels: Record<CategorySlug, string> = {
  mouse: "Mouses",
  teclado: "Teclados",
  monitor: "Monitores",
  mousepad: "Mousepads",
  switch: "Switches",
  fone: "Fones",
};

/** The Nota geral field of each Categoria: the Fonte names it after its benchmark type. */
export const overallRatingKeys: Record<CategorySlug, string> = {
  mouse: "overallRatingMouse",
  teclado: "overallRatingKeyboard",
  monitor: "overallRatingMonitor",
  mousepad: "overallRatingMousepad",
  switch: "overallRatingKeyboardSwitch",
  fone: "overallRatingEarphone",
};

export function isCategorySlug(value: string): value is CategorySlug {
  return categorySlugs.some((slug) => slug === value);
}
