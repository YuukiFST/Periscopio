import type { z } from "zod";
import type { CategorySlug } from "../categories.ts";
import { categoryDataSchema, metaSchema, type CategoryData, type Meta } from "./schema.ts";

async function fetchValidated<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
): Promise<z.output<Schema>> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`GET ${path}: HTTP ${response.status}`);
  return schema.parse(await response.json());
}

/**
 * Keeps one promise per key for the session, so a sort or a search never
 * refetches a data file; a failed load is dropped so the next one retries.
 */
function loadOnce<Key, Value>(
  cache: Map<Key, Promise<Value>>,
  key: Key,
  load: () => Promise<Value>,
): Promise<Value> {
  const cached = cache.get(key);
  if (cached) return cached;
  const loading = load();
  cache.set(key, loading);
  loading.catch(() => cache.delete(key));
  return loading;
}

const categoryDataCache = new Map<CategorySlug, Promise<CategoryData>>();
const metaCache = new Map<"meta", Promise<Meta>>();

export function loadCategoryData(category: CategorySlug): Promise<CategoryData> {
  return loadOnce(categoryDataCache, category, () =>
    fetchValidated(`/data/${category}.json`, categoryDataSchema),
  );
}

export function loadMeta(): Promise<Meta> {
  return loadOnce(metaCache, "meta", () => fetchValidated("/data/meta.json", metaSchema));
}
