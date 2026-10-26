import { useState } from "react";
import { categorySlugs } from "../categories.ts";
import { loadCategoryData } from "./load-data.ts";
import type { CategoryData } from "./schema.ts";

export type CategoriesLoad =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "loaded"; categories: CategoryData[] };

/**
 * The three Categorias, loaded by `ensureLoaded` the first time a list over
 * all of them opens; after a failed load, the next call tries again.
 */
export function useAllCategories(): [CategoriesLoad, ensureLoaded: () => void] {
  const [load, setLoad] = useState<CategoriesLoad>({ status: "loading" });
  function ensureLoaded() {
    if (load.status === "loaded") return;
    setLoad({ status: "loading" });
    Promise.all(categorySlugs.map(loadCategoryData)).then(
      (categories) => setLoad({ status: "loaded", categories }),
      () => setLoad({ status: "failed" }),
    );
  }
  return [load, ensureLoaded];
}
