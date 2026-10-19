import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { categoryDataSchema, metaSchema } from "../../src/data/schema.ts";
import {
  editRecordedCompanies,
  editRecordedSnapshot,
  loadRecordedRoutes,
  snapshotPath,
  startRecordedEyejokerServer,
  type RecordedRoutes,
} from "./recorded-eyejoker-server.ts";

const updateCli = join(import.meta.dirname, "../../pipeline/update-data.ts");
const fixturePhotos = join(import.meta.dirname, "fixtures/cdn");
const goldenDir = join(import.meta.dirname, "golden");
const keptPhoto = "6ff30934-3cd1-4ab8-9697-c774df386393.avif";
const orphanPhoto = "00000000-0000-4000-8000-000000000000.avif";
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "eyejoker-update-"));
  tempDirs.push(dir);
  return dir;
}

type CliRun = { exitCode: number; stdout: string; stderr: string; requestedPaths: string[] };

/** Runs `pipeline/update-data.ts` against the recorded EyeJoker, as `pnpm update-data` does. */
async function runUpdateCli(
  routes: RecordedRoutes,
  outDir: string,
  stepSummaryPath: string | null,
): Promise<CliRun> {
  const server = await startRecordedEyejokerServer(routes);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    EYEJOKER_API_URL: server.apiUrl,
    EYEJOKER_CDN_URL: server.cdnUrl,
    EYEJOKER_OUT_DIR: outDir,
  };
  if (stepSummaryPath) env.GITHUB_STEP_SUMMARY = stepSummaryPath;
  else delete env.GITHUB_STEP_SUMMARY;
  try {
    return await new Promise((resolve) => {
      execFile(process.execPath, [updateCli], { env }, (error, stdout, stderr) => {
        const exitCode = error ? (typeof error.code === "number" ? error.code : -1) : 0;
        resolve({ exitCode, stdout, stderr, requestedPaths: server.requestedPaths });
      });
    });
  } finally {
    await server.close();
  }
}

/** Every file under `dir` with its bytes, to prove a refused Atualização changed nothing. */
async function readTree(dir: string): Promise<Map<string, string>> {
  const tree = new Map<string, string>();
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    tree.set(relative(dir, path).replaceAll("\\", "/"), (await readFile(path)).toString("base64"));
  }
  return tree;
}

async function listPhotos(imagesDir: string): Promise<string> {
  const names = (await readdir(imagesDir)).toSorted();
  const lines = await Promise.all(
    names.map(async (name) => `${name} ${(await readFile(join(imagesDir, name))).byteLength}`),
  );
  return `${lines.join("\n")}\n`;
}

describe("an Atualização against the recorded EyeJoker excerpt", () => {
  let outDir: string;
  let summary: string;
  let run: CliRun;
  let startedAt: number;

  beforeAll(async () => {
    const dir = await mkdtemp(join(tmpdir(), "eyejoker-update-"));
    outDir = join(dir, "public");
    await mkdir(join(outDir, "images"), { recursive: true });
    await copyFile(join(fixturePhotos, keptPhoto), join(outDir, "images", keptPhoto));
    await writeFile(join(outDir, "images", orphanPhoto), "a photo no Product uses");
    const summaryPath = join(dir, "step-summary.md");
    startedAt = Date.now();
    run = await runUpdateCli(await loadRecordedRoutes(), outDir, summaryPath);
    summary = await readFile(summaryPath, "utf8");
    return () => rm(dir, { recursive: true, force: true });
  });

  test("writes the normalized files, fetches new photos only and deletes orphans", async () => {
    expect(run.stderr).toBe("");
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe("");
    for (const slug of ["mouse", "teclado", "monitor"]) {
      const written = await readFile(join(outDir, "data", `${slug}.json`), "utf8");
      await expect(written).toMatchFileSnapshot(join(goldenDir, "data", `${slug}.json`));
    }

    const meta = metaSchema.parse(
      JSON.parse(await readFile(join(outDir, "data/meta.json"), "utf8")),
    );
    const updatedAt = Date.parse(meta.updatedAt);
    expect(updatedAt).toBeGreaterThanOrEqual(startedAt - 1000);
    expect(updatedAt).toBeLessThanOrEqual(Date.now());
    const stableMeta = `${JSON.stringify({ ...meta, updatedAt: "<updatedAt>" }, null, 2)}\n`;
    await expect(stableMeta).toMatchFileSnapshot(join(goldenDir, "data/meta.json"));

    await expect(summary).toMatchFileSnapshot(join(goldenDir, "step-summary.md"));
    await expect(await listPhotos(join(outDir, "images"))).toMatchFileSnapshot(
      join(goldenDir, "images.txt"),
    );
    expect(run.requestedPaths.filter((path) => !path.startsWith("GET "))).toEqual([]);
    expect(run.requestedPaths).not.toContain(`GET /cdn/${keptPhoto}`);
  });

  test("the recorded excerpt has a pt label for every key", () => {
    expect(summary).toContain("Nenhuma chave sem tradução pt.");
  });
});

type Refusal = {
  name: string;
  edit: (routes: RecordedRoutes) => void;
  reason: RegExp;
  /** How many times the CLI asks for the failing path before giving up. */
  attempts?: { path: string; count: number };
};

const refusals: Refusal[] = [
  {
    name: "EyeJoker answers with an error",
    edit: (routes) =>
      routes.set(snapshotPath("keyboard"), {
        status: 503,
        contentType: "text/plain",
        body: "down",
      }),
    reason: /GET .*\/api\/benchmark\/keyboard\/snapshot falhou \(HTTP 503\)/,
    attempts: { path: `GET ${snapshotPath("keyboard")}`, count: 3 },
  },
  {
    name: "a Categoria falls below 90% of the published rows",
    edit: (routes) =>
      editRecordedSnapshot(routes, "mouse", (snapshot) => {
        snapshot.data.rows = snapshot.data.rows.slice(0, 5);
      }),
    reason: /mouse: 5 Produtos, abaixo de 90% dos 6 publicados antes/,
  },
  {
    name: "a manufacturer does not resolve",
    edit: (routes) =>
      editRecordedCompanies(routes, (companies) => {
        companies.data = companies.data.slice(1);
      }),
    reason: /o fabricante ".+" do Produto .+ não está em \/api\/company/,
  },
  {
    name: "the photo URLs move to /products/ (regression: every photo was deleted)",
    edit: (routes) => {
      for (const category of ["mouse", "keyboard", "monitor"] as const) {
        editRecordedSnapshot(routes, category, (snapshot) => {
          for (const row of snapshot.data.rows) {
            const imageUrl = row.values.productImage;
            if (!imageUrl) continue;
            const moved = new URL(imageUrl);
            moved.pathname = `/products${moved.pathname}`;
            row.values.productImage = moved.href;
          }
        });
      }
    },
    reason: /mouse: 5 de 5 Produtos com foto têm um endereço de foto inesperado/,
  },
  {
    name: "the photo field comes back empty (regression: every photo was deleted)",
    edit: (routes) => {
      for (const category of ["mouse", "keyboard", "monitor"] as const) {
        editRecordedSnapshot(routes, category, (snapshot) => {
          for (const row of snapshot.data.rows) row.values.productImage = "";
        });
      }
    },
    reason: /mouse: 4 de 4 Produtos publicados com foto ficariam sem foto/,
  },
];

test.each(refusals)(
  "refuses the Atualização and changes no file when $name",
  async ({ edit, reason, attempts }) => {
    const outDir = await makeTempDir();
    const published = await runUpdateCli(await loadRecordedRoutes(), outDir, null);
    expect(published.exitCode).toBe(0);
    const filesBefore = await readTree(outDir);

    const routes = await loadRecordedRoutes();
    edit(routes);
    const refused = await runUpdateCli(routes, outDir, null);

    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toMatch(reason);
    expect(refused.stdout).toBe("");
    expect(await readTree(outDir)).toEqual(filesBefore);
    if (attempts) {
      expect(refused.requestedPaths.filter((path) => path === attempts.path)).toHaveLength(
        attempts.count,
      );
    }
  },
);

test("a new ENUM value without pt passes and is listed in the summary", async () => {
  const routes = await loadRecordedRoutes();
  const productId = "003586ba-0cbf-4932-843c-24e5f56e47c2";
  editRecordedSnapshot(routes, "mouse", (snapshot) => {
    const housing = snapshot.data.detailColumns.spec.find(
      (field) => field.field === "housingMouse",
    );
    housing?.dataList.push({ field: "양손", names: { ko: "양손", en: "Ambidextrous" } });
    for (const row of snapshot.data.rows)
      if (row.id === productId) row.values.housingMouse = "양손";
  });
  const outDir = await makeTempDir();
  const run = await runUpdateCli(routes, outDir, null);

  expect(run.exitCode).toBe(0);
  expect(run.stdout).toContain("### Chaves sem tradução pt\n\n- `valor:housingMouse:양손`\n");
  const mouse = categoryDataSchema.parse(
    JSON.parse(await readFile(join(outDir, "data/mouse.json"), "utf8")),
  );
  const product = mouse.products.find((candidate) => candidate.id === productId);
  expect(product?.values.housingMouse).toEqual(["양손"]);
});

test("regression: an empty or foreign Link AliExpress becomes null and is listed, instead of refusing the Atualização", async () => {
  const emptyLinkId = "003586ba-0cbf-4932-843c-24e5f56e47c2";
  const foreignLinkId = "0390fea6-efb9-45ea-a1a3-71b170224e58";
  const twoLinksId = "1f2e9ba6-5ac5-4f0d-b986-7cb4203b5d6c";
  const routes = await loadRecordedRoutes();
  editRecordedSnapshot(routes, "mouse", (snapshot) => {
    for (const row of snapshot.data.rows) {
      const aliLink = row.affiliateLinks?.find((link) => link.platform === "ALI");
      if (!aliLink) continue;
      if (row.id === emptyLinkId) aliLink.affiliateUrl = "";
      if (row.id === foreignLinkId)
        aliLink.affiliateUrl = "https://aliexpress.com.example.net/e/_x";
      // A second, inactive ALI link listed first loses to the active, approved, primary one.
      if (row.id === twoLinksId) {
        row.affiliateLinks?.unshift({
          ...aliLink,
          affiliateUrl: "https://s.click.aliexpress.com/e/_inactive",
          status: "INACTIVE",
          isPrimary: false,
        });
      }
    }
  });
  const outDir = await makeTempDir();
  const run = await runUpdateCli(routes, outDir, null);

  expect(run.stderr).toBe("");
  expect(run.exitCode).toBe(0);
  expect(run.stdout).toContain(
    `### Produtos com Link AliExpress inválido\n\n- \`${emptyLinkId}\`\n- \`${foreignLinkId}\`\n`,
  );
  const mouse = categoryDataSchema.parse(
    JSON.parse(await readFile(join(outDir, "data/mouse.json"), "utf8")),
  );
  const aliUrls = new Map(mouse.products.map((product) => [product.id, product.aliUrl]));
  expect(aliUrls.get(emptyLinkId)).toBeNull();
  expect(aliUrls.get(foreignLinkId)).toBeNull();
  expect(aliUrls.get(twoLinksId)).toBe("https://s.click.aliexpress.com/e/_oo1XMw2");
});
