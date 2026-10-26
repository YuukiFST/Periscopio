import { useCallback, useState } from "react";
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
 * `ensureLoaded` keeps its identity, so an effect can call it on mount.
 */
export function useAllCategories(): [CategoriesLoad, ensureLoaded: () => void] {
  const [load, setLoad] = useState<CategoriesLoad>({ status: "loading" });
  // `loadCategoryData` fetches each Categoria once, so a call after the load costs nothing.
  const ensureLoaded = useCallback(() => {
    setLoad((current) => (current.status === "failed" ? { status: "loading" } : current));
    Promise.all(categorySlugs.map(loadCategoryData)).then(
      (categories) =>
        setLoad((current) =>
          current.status === "loaded" ? current : { status: "loaded", categories },
        ),
      () => setLoad({ status: "failed" }),
    );
  }, []);
  return [load, ensureLoaded];
}
