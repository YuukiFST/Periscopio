import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import type { CategorySlug } from "../src/categories.ts";
import {
  categoryDataSchema,
  metaSchema,
  type CategoryData,
  type Meta,
} from "../src/data/schema.ts";
import {
  eyejokerCategories,
  fetchCompanies,
  fetchSnapshot,
  type EyejokerCategory,
  type EyejokerSnapshot,
} from "./eyejoker-api.ts";
import { deleteOrphanImages, downloadNewImages } from "./images.ts";
import { normalizeCategory, type NormalizedCategory } from "./normalize.ts";
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

/** Above this share of photo URLs that are not `/<uuid>.avif`, EyeJoker moved its photos. */
const maximumUnusableImageShare = 0.1;

type UpdateConfig = {
  apiUrl: string;
  cdnUrl: string;
  outDir: string;
  stepSummaryPath: string | undefined;
};

function readConfig(env: NodeJS.ProcessEnv): UpdateConfig {
  return {
    apiUrl: env.EYEJOKER_API_URL || "https://eyejokerdb.com",
    cdnUrl: env.EYEJOKER_CDN_URL || "https://cdn.eyejokerdb.com",
    outDir: resolve(env.EYEJOKER_OUT_DIR || join(import.meta.dirname, "../public")),
    stepSummaryPath: env.GITHUB_STEP_SUMMARY || undefined,
  };
}

async function readPublishedMeta(metaPath: string): Promise<Meta | null> {
  let text: string;
  try {
    text = await readFile(metaPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new UpdateRefusedError(`${metaPath} não é JSON.`);
  }
  const result = metaSchema.safeParse(body);
  if (result.success) return result.data;
  throw new UpdateRefusedError(`${metaPath} é inválido:\n${z.prettifyError(result.error)}`);
}

function refuseRowDrop(normalized: CategoryData[], published: Meta | null): void {
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

function validateOutput(data: CategoryData): CategoryData {
  const result = categoryDataSchema.safeParse(data);
  if (result.success) return result.data;
  throw new UpdateRefusedError(
    `${data.category}: o formato normalizado não passou na validação:\n${z.prettifyError(result.error)}`,
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

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`);
  await rename(partial, path);
}

async function runUpdate(config: UpdateConfig): Promise<void> {
  const dataDir = join(config.outDir, "data");
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
  refuseRowDrop(validated, await readPublishedMeta(metaPath));

  await mkdir(dataDir, { recursive: true });
  await mkdir(imagesDir, { recursive: true });
  const wantedImages = new Set(
    validated.flatMap(({ products }) =>
      products.flatMap((product) => (product.image ? [imageFileName(product.image)] : [])),
    ),
  );
  const images = await downloadNewImages(config.cdnUrl, imagesDir, wantedImages);
  const published = validated.map((data) => withoutMissingImages(data, images.available));

  for (const data of published) await writeJsonFile(join(dataDir, `${data.category}.json`), data);
  const counts = { mouse: 0, teclado: 0, monitor: 0 };
  for (const data of published) counts[data.category] = data.products.length;
  const meta: Meta = { updatedAt: new Date().toISOString(), counts };
  await writeJsonFile(metaPath, meta);
  const deletedImages = await deleteOrphanImages(imagesDir, images.available);

  const summary = renderSummary({
    counts,
    imagesDownloaded: images.downloaded.length,
    imagesDeleted: deletedImages.length,
    imageFailures: images.failed,
    unusableImageProductIds: normalized.flatMap((category) => category.unusableImageProductIds),
    ignoredFieldKeys: [
      ...new Set(normalized.flatMap((category) => category.ignoredFieldKeys)),
    ].toSorted(),
    untranslatedKeys: [...new Set(published.flatMap(findUntranslatedKeys))].toSorted(),
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
