/**
 * Records the Fonte excerpt the pipeline tests serve: the real responses of
 * `/api/benchmark/<category>/snapshot` with only the Products below, the
 * companies they reference, their AVIF photos (the pipeline never fetches a PNG one),
 * and the Cotação from Frankfurter. Run it with
 * `node tests/pipeline/record-eyejoker-excerpt.ts`, then regenerate the goldens.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { frankfurterKrwBrlPath } from "../../pipeline/exchange-rate.ts";

const apiUrl = "https://eyejokerdb.com";
const krwBrlRateUrl = `https://api.frankfurter.dev${frankfurterKrwBrlPath}`;
const fixturesDir = join(import.meta.dirname, "fixtures");

/** Each id covers a shape the normalization handles. */
const excerptProductIds: Record<string, string[]> = {
  mouse: [
    "003586ba-0cbf-4932-843c-24e5f56e47c2", // ALI and other shop links, Korean wheel switch text
    "2cf40f05-fa65-4a5c-936a-c67de7025af3", // multi-select housing "대칭,비대칭"
    "201270eb-b392-4e41-96a9-1b609a77e795", // multi-select material
    "1f2e9ba6-5ac5-4f0d-b986-7cb4203b5d6c", // ANTICIPATING; photo left out to simulate a failed download
    "0fbec015-8d94-469d-993e-1d9d5138fb9b", // no priceKrw, no photo, no shop links
    "0390fea6-efb9-45ea-a1a3-71b170224e58", // priceKrw 27769, rounded to 27800
  ],
  keyboard: [
    "49c95966-e910-4628-86d1-b7915439e9af", // ANTICIPATING, Korean sound absorption and angle texts
    "021979aa-b222-47d3-b5ec-8b59d671aff4", // Korean switch text, ALI link
    "04ef23e4-e4bd-4212-be44-daabe2640afd", // date-only DATETIME
    "479c4333-c25b-4e79-89a5-74d93565c4b5", // multi-select mounting
  ],
  monitor: [
    "7aa60f74-aa55-44f0-9858-9d672a19fba5", // ALI link
    "168e2700-995b-4632-86e9-08613515a315", // multi-select stand adjustments
    "0780a9f3-3c88-41ac-97e9-1c45f31c9a38", // discontinued, Korean product name
    "0138f613-dedd-4d4c-86a6-74798a5baf14", // no priceKrw
  ],
  "mouse-pad": [
    "03986584-64e3-43a9-a783-589a977280c2", // photo under benchmark-data/, letter grades, Korean tendency
    "772219d3-04de-4c26-b8a7-57944bbe9da0", // photo at the CDN root, Korean material and base
    "0e445432-bf3f-493e-b12b-bc0da30b9152", // PNG photo, published without one; ALI link
  ],
  "keyboard-switch": [
    "0b6be29e-286b-4809-a851-9e5d0c158687", // measured forces and travel, Korean feel "리니어"
    "0d698b78-1590-444a-9e24-98ca40baf688", // priceKrw 1126, rounded to 1100
    "22a93098-1df3-4dca-bdbc-36a5b7f4c3fb", // PNG photo at the CDN root; ALI link
    "c6dd1f29-6524-40f5-bca6-ceaf6a415066", // no manufacturer yet, left out
  ],
  earphone: [
    "0d24702d-a3a2-49ba-beff-c1e2a9dd7885", // wired, Korean FR texts and tags, ALI link
    "03177f59-1a80-4502-8c74-8e70683a43bf", // wireless
  ],
};
const photosLeftOut = new Set(["1f2e9ba6-5ac5-4f0d-b986-7cb4203b5d6c"]);

/** Loose objects keep every key, so the excerpt stays a verbatim copy. */
const recordedSnapshotSchema = z.looseObject({
  data: z.looseObject({
    rows: z.array(z.looseObject({ id: z.string(), values: z.record(z.string(), z.string()) })),
  }),
});
const recordedCompaniesSchema = z.looseObject({
  data: z.array(z.looseObject({ id: z.string() })),
});

async function getJson<Schema extends z.ZodType>(
  url: string,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url}: HTTP ${response.status}`);
  return schema.parse(await response.json());
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

await rm(fixturesDir, { recursive: true, force: true });
const manufacturerIds = new Set<string>();
const photoUrls: string[] = [];

for (const [category, ids] of Object.entries(excerptProductIds)) {
  const snapshot = await getJson(
    `${apiUrl}/api/benchmark/${category}/snapshot`,
    recordedSnapshotSchema,
  );
  const wanted = new Set(ids);
  snapshot.data.rows = snapshot.data.rows.filter((row) => wanted.has(row.id));
  if (snapshot.data.rows.length !== wanted.size) throw new Error(`${category}: a Product is gone`);
  for (const row of snapshot.data.rows) {
    manufacturerIds.add(row.values.manufacturer ?? "");
    const photoUrl = row.values.productImage ?? "";
    if (photoUrl.endsWith(".avif") && !photosLeftOut.has(row.id)) photoUrls.push(photoUrl);
  }
  await writeJson(join(fixturesDir, "api/benchmark", category, "snapshot.json"), snapshot);
}

const companies = await getJson(`${apiUrl}/api/company`, recordedCompaniesSchema);
companies.data = companies.data.filter((company) => manufacturerIds.has(company.id));
await writeJson(join(fixturesDir, "api/company.json"), companies);

for (const photoUrl of photoUrls) {
  const response = await fetch(photoUrl);
  if (!response.ok) throw new Error(`GET ${photoUrl}: HTTP ${response.status}`);
  const photoPath = join(fixturesDir, "cdn", new URL(photoUrl).pathname.slice(1));
  await mkdir(join(photoPath, ".."), { recursive: true });
  await writeFile(photoPath, new Uint8Array(await response.arrayBuffer()));
}

await writeJson(
  join(fixturesDir, "frankfurter/krw-brl.json"),
  await getJson(krwBrlRateUrl, z.looseObject({})),
);
