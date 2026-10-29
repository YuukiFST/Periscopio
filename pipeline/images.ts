import { readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GetFailedError, getWithRetries } from "./eyejoker-api.ts";

const downloadConcurrency = 4;
const imageFileNamePattern = /^[0-9a-f-]{36}\.avif$/;
const avifBrands = new Set(["avif", "avis"]);

export type ImageFailure = { fileName: string; reason: string };

export type ImageSyncResult = {
  available: Set<string>;
  downloaded: string[];
  failed: ImageFailure[];
};

/** An ISO-BMFF file whose `ftyp` box names an AVIF brand. */
function isAvif(bytes: Uint8Array): boolean {
  const text = new TextDecoder("latin1");
  return (
    text.decode(bytes.subarray(4, 8)) === "ftyp" &&
    avifBrands.has(text.decode(bytes.subarray(8, 12)))
  );
}

function failureReason(error: unknown): string {
  if (error instanceof GetFailedError) return error.failure;
  return error instanceof Error ? error.message : String(error);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function downloadImage(
  cdnUrl: string,
  imagesDir: string,
  fileName: string,
  cdnPath: string,
): Promise<void> {
  const response = await getWithRetries(`${cdnUrl}${cdnPath}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!isAvif(bytes)) throw new Error("o arquivo não é AVIF");
  const target = join(imagesDir, fileName);
  const partial = `${target}.partial`;
  await writeFile(partial, bytes);
  await rename(partial, target);
}

/**
 * Downloads each photo missing from `imagesDir`, 4 at a time, from its path
 * on the CDN (`cdnPaths`, by file name). A photo file is immutable (its name
 * is a UUID), so one already on disk is kept as is. A failed download is
 * reported and never throws.
 */
export async function downloadNewImages(
  cdnUrl: string,
  imagesDir: string,
  cdnPaths: ReadonlyMap<string, string>,
): Promise<ImageSyncResult> {
  const result: ImageSyncResult = { available: new Set(), downloaded: [], failed: [] };
  const queue: [fileName: string, cdnPath: string][] = [];
  for (const [fileName, cdnPath] of [...cdnPaths].toSorted(([left], [right]) =>
    left < right ? -1 : 1,
  )) {
    if (await fileExists(join(imagesDir, fileName))) result.available.add(fileName);
    else queue.push([fileName, cdnPath]);
  }

  async function worker(): Promise<void> {
    for (let entry = queue.shift(); entry !== undefined; entry = queue.shift()) {
      const [fileName, cdnPath] = entry;
      try {
        await downloadImage(cdnUrl, imagesDir, fileName, cdnPath);
        result.available.add(fileName);
        result.downloaded.push(fileName);
      } catch (error) {
        result.failed.push({ fileName, reason: failureReason(error) });
      }
    }
  }
  await Promise.all(Array.from({ length: downloadConcurrency }, worker));

  result.downloaded.sort();
  result.failed.sort((left, right) => (left.fileName < right.fileName ? -1 : 1));
  return result;
}

/** Deletes every `<uuid>.avif` in `imagesDir` that no Product references. */
export async function deleteOrphanImages(
  imagesDir: string,
  referenced: ReadonlySet<string>,
): Promise<string[]> {
  const entries = await readdir(imagesDir);
  const orphans = entries.filter(
    (name) => imageFileNamePattern.test(name) && !referenced.has(name),
  );
  await Promise.all(orphans.map((name) => rm(join(imagesDir, name))));
  return orphans.toSorted();
}
