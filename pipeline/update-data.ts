import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import type { CategorySlug } from "../src/categories.ts";
import {
  categoryDataSchema,
  isTested,
  krwBrlRateSchema,
  metaSchema,
  priceEntrySchema,
  priceHistorySchema,
  productSchema,
  type CategoryData,
  type Meta,
  type PriceHistory,
  type Product,
} from "../src/data/schema.ts";
import {
  eyejokerCategories,
  fetchCompanies,
  fetchSnapshot,
  type EyejokerCategory,
  type EyejokerSnapshot,
} from "./eyejoker-api.ts";
import { fetchKrwBrlRate } from "./exchange-rate.ts";
import { deleteOrphanImages, downloadNewImages } from "./images.ts";
import { normalizeCategory, type NormalizedCategory } from "./normalize.ts";
import { nextPriceHistory, priceDateOf } from "./price-history.ts";
import { publishSummary, renderSummary } from "./summary.ts";
import { findUntranslatedKeys } from "./translation-gaps.ts";
import { UpdateRefusedError } from "./update-refused-error.ts";

const slugByEyejokerCategory = {
  mouse: "mouse",
  keyboard: "teclado",
  monitor: "monitor",
} as const satisfies Record<EyejokerCategory, CategorySlug>;

/** A Categoria may shrink by at most 10% from the published version. */
const minimumRowShare = 0.9;

/** Above this share of photo URLs that are not `/<uuid>.avif`, the Fonte moved its photos. */
const maximumUnusableImageShare = 0.1;

/** A Categoria may take the photo away from at most 10% of the published Produtos it keeps. */
const maximumLostImageShare = 0.1;

/** Only what the photo check and the Novidade dates read, so an older published file still parses. */
const publishedProductsSchema = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      image: z.string().nullable(),
      status: z.string().nullable(),
      firstSeenAt: productSchema.shape.firstSeenAt,
      testedAt: productSchema.shape.testedAt,
    }),
  ),
});
type PublishedProducts = z.infer<typeof publishedProductsSchema>;
type PublishedProduct = PublishedProducts["products"][number];

/** Only what the row check and the kept Cotação read, so a meta.json with newer keys still parses. */
const publishedMetaSchema = z.object({
  counts: metaSchema.shape.counts,
  krwBrl: krwBrlRateSchema.optional().catch(undefined),
});
type PublishedMeta = z.infer<typeof publishedMetaSchema>;

/** Any number of entries and any extra keys, so a change to the cap or the entry shape still reads it. */
const publishedPriceHistorySchema = z.object({
  products: z.record(
    z.string(),
    z.array(
      z.object({ date: priceEntrySchema.shape.date, priceKrw: priceEntrySchema.shape.priceKrw }),
    ),
  ),
});

type UpdateConfig = {
  apiUrl: string;
  cdnUrl: string;
  frankfurterUrl: string;
  outDir: string;
  stepSummaryPath: string | undefined;
};

function readConfig(env: NodeJS.ProcessEnv): UpdateConfig {
  return {
    apiUrl: env.EYEJOKER_API_URL || "https://eyejokerdb.com",
    cdnUrl: env.EYEJOKER_CDN_URL || "https://cdn.eyejokerdb.com",
    frankfurterUrl: env.FRANKFURTER_API_URL || "https://api.frankfurter.dev",
    outDir: resolve(env.EYEJOKER_OUT_DIR || join(import.meta.dirname, "../public")),
    stepSummaryPath: env.GITHUB_STEP_SUMMARY || undefined,
  };
}

async function readPublishedFile<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new UpdateRefusedError(`${path} não é JSON.`);
  }
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  throw new UpdateRefusedError(`${path} é inválido:\n${z.prettifyError(result.error)}`);
}

function refuseRowDrop(normalized: CategoryData[], published: PublishedMeta | null): void {
  if (!published) return;
  for (const { category, products } of normalized) {
    const previous = published.counts[category];
    if (products.length >= previous * minimumRowShare) continue;
    throw new UpdateRefusedError(
      `${category}: ${products.length} Produtos, abaixo de 90% dos ${previous} publicados antes.`,
    );
  }
}

function refuseUnusableImages(normalized: NormalizedCategory[]): void {
  for (const { data, imageUrlCount, unusableImageProductIds } of normalized) {
    const unusable = unusableImageProductIds.length;
    if (unusable <= imageUrlCount * maximumUnusableImageShare) continue;
    throw new UpdateRefusedError(
      `${data.category}: ${unusable} de ${imageUrlCount} Produtos com foto têm um endereço de foto inesperado (não é /<uuid>.avif), acima de 10%; as fotos publicadas seriam apagadas.`,
    );
  }
}

function refuseLostImages(data: CategoryData, published: PublishedProducts | null): void {
  if (!published) return;
  const imageById = new Map(data.products.map((product) => [product.id, product.image]));
  const kept = published.products.filter(
    (product) => product.image !== null && imageById.has(product.id),
  );
  const lost = kept.filter((product) => imageById.get(product.id) === null).length;
  if (lost <= kept.length * maximumLostImageShare) return;
  throw new UpdateRefusedError(
    `${data.category}: ${lost} de ${kept.length} Produtos publicados com foto ficariam sem foto, acima de 10%; as fotos publicadas seriam apagadas.`,
  );
}

function validateOutput(data: CategoryData): CategoryData {
  const result = categoryDataSchema.safeParse(data);
  if (result.success) return result.data;
  throw new UpdateRefusedError(
    `${data.category}: o formato normalizado não passou na validação:\n${z.prettifyError(result.error)}`,
  );
}

function validatePriceHistory(history: PriceHistory): PriceHistory {
  const result = priceHistorySchema.safeParse(history);
  if (result.success) return result.data;
  throw new UpdateRefusedError(
    `${history.category}: o Histórico de preço não passou na validação:
${z.prettifyError(result.error)}`,
  );
}

function imageFileName(imagePath: string): string {
  return imagePath.slice("/images/".length);
}

function withoutMissingImages(data: CategoryData, available: ReadonlySet<string>): CategoryData {
  const products = data.products.map((product) =>
    product.image && !available.has(imageFileName(product.image))
      ? { ...product, image: null }
      : product,
  );
  return { ...data, products };
}

type NovidadeDates = Pick<Product, "firstSeenAt" | "testedAt">;

/**
 * Carries the dates forward from the published Produto. A Produto the published
 * file lacks is new in this Atualização. One published before the dates existed,
 * or every Produto when nothing was published, gets null, so nothing reads as new.
 */
function novidadeDatesOf(
  product: Product,
  published: ReadonlyMap<string, PublishedProduct> | null,
  updatedAt: string,
): NovidadeDates {
  if (!published) return { firstSeenAt: null, testedAt: null };
  const previous = published.get(product.id);
  if (!previous) return { firstSeenAt: updatedAt, testedAt: isTested(product) ? updatedAt : null };
  if (previous.firstSeenAt === undefined) return { firstSeenAt: null, testedAt: null };
  const becameTested = isTested(product) && !isTested(previous);
  return {
    firstSeenAt: previous.firstSeenAt,
    testedAt: previous.testedAt ?? (becameTested ? updatedAt : null),
  };
}

function withNovidadeDates(
  data: CategoryData,
  published: PublishedProducts | null,
  updatedAt: string,
): CategoryData {
  const publishedById =
    published && new Map(published.products.map((product) => [product.id, product]));
  const products = data.products.map((product) => ({
    ...product,
    ...novidadeDatesOf(product, publishedById, updatedAt),
  }));
  return { ...data, products };
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`);
  await rename(partial, path);
}

async function runUpdate(config: UpdateConfig): Promise<void> {
  const dataDir = join(config.outDir, "data");
  const priceHistoryDir = join(dataDir, "precos");
  const imagesDir = join(config.outDir, "images");
  const metaPath = join(dataDir, "meta.json");

  const snapshots = new Map<EyejokerCategory, EyejokerSnapshot>();
  for (const category of eyejokerCategories) {
    snapshots.set(category, await fetchSnapshot(config.apiUrl, category));
  }
  const companies = new Map(
    (await fetchCompanies(config.apiUrl)).map((company) => [company.id, company]),
  );

  const normalized: NormalizedCategory[] = [...snapshots].map(([category, snapshot]) =>
    normalizeCategory(slugByEyejokerCategory[category], snapshot, companies),
  );
  refuseUnusableImages(normalized);
  const validated = normalized.map(({ data }) => validateOutput(data));
  const publishedMeta = await readPublishedFile(metaPath, publishedMetaSchema);
  refuseRowDrop(validated, publishedMeta);
  const updatedAt = new Date().toISOString();
  const publishedProducts = new Map<CategorySlug, PublishedProducts | null>();
  const priceHistories: PriceHistory[] = [];
  for (const data of validated) {
    const publishedPath = join(dataDir, `${data.category}.json`);
    const published = await readPublishedFile(publishedPath, publishedProductsSchema);
    refuseLostImages(data, published);
    publishedProducts.set(data.category, published);
    const priceHistoryPath = join(priceHistoryDir, `${data.category}.json`);
    const publishedPriceHistory = await readPublishedFile(
      priceHistoryPath,
      publishedPriceHistorySchema,
    );
    priceHistories.push(
      validatePriceHistory(nextPriceHistory(publishedPriceHistory, data, priceDateOf(updatedAt))),
    );
  }

  await mkdir(priceHistoryDir, { recursive: true });
  await mkdir(imagesDir, { recursive: true });
  const wantedImages = new Set(
    validated.flatMap(({ products }) =>
      products.flatMap((product) => (product.image ? [imageFileName(product.image)] : [])),
    ),
  );
  const krwBrlFetch = await fetchKrwBrlRate(config.frankfurterUrl);
  const krwBrl = krwBrlFetch.ok ? krwBrlFetch.rate : publishedMeta?.krwBrl;
  const images = await downloadNewImages(config.cdnUrl, imagesDir, wantedImages);
  const published = validated.map((data) =>
    withNovidadeDates(
      withoutMissingImages(data, images.available),
      publishedProducts.get(data.category) ?? null,
      updatedAt,
    ),
  );

  for (const data of published) await writeJsonFile(join(dataDir, `${data.category}.json`), data);
  for (const history of priceHistories) {
    await writeJsonFile(join(priceHistoryDir, `${history.category}.json`), history);
  }
  const counts = { mouse: 0, teclado: 0, monitor: 0 };
  for (const data of published) counts[data.category] = data.products.length;
  const meta: Meta = { updatedAt, counts, ...(krwBrl && { krwBrl }) };
  await writeJsonFile(metaPath, meta);
  const deletedImages = await deleteOrphanImages(imagesDir, images.available);

  const summary = renderSummary({
    counts,
    imagesDownloaded: images.downloaded.length,
    imagesDeleted: deletedImages.length,
    imageFailures: images.failed,
    unusableImageProductIds: normalized.flatMap((category) => category.unusableImageProductIds),
    invalidAliUrlProductIds: normalized
      .flatMap((category) => category.invalidAliUrlProductIds)
      .toSorted(),
    ignoredFieldKeys: [
      ...new Set(normalized.flatMap((category) => category.ignoredFieldKeys)),
    ].toSorted(),
    untranslatedKeys: [...new Set(published.flatMap(findUntranslatedKeys))].toSorted(),
    krwBrlFetch,
    krwBrl,
  });
  await publishSummary(summary, config.stepSummaryPath);
}

try {
  await runUpdate(readConfig(process.env));
} catch (error) {
  if (error instanceof UpdateRefusedError) {
    console.error(`Atualização recusada, nenhum arquivo foi alterado: ${error.message}`);
  } else {
    console.error("Atualização falhou:", error);
  }
  process.exitCode = 1;
}
