/**
 * Writes `public/data/precos/<categoria>.json` from the git history of
 * `public/data/<categoria>.json`, replaying each commit that changed it as an
 * Atualização dated on the commit's day (UTC). Run once, from a checkout with
 * the history fetched: `node scripts/backfill-price-history.ts [ref]`
 * (default `origin/main`). It overwrites the Histórico de preço files.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { nextPriceHistory } from "../pipeline/price-history.ts";
import { categorySlugs, type CategorySlug } from "../src/categories.ts";
import { priceHistorySchema, productSchema, type PriceHistory } from "../src/data/schema.ts";

const runFile = promisify(execFile);
const repoDir = join(import.meta.dirname, "..");
const priceHistoryDir = join(repoDir, "public/data/precos");
const ref = process.argv[2] ?? "origin/main";

/** Only what the Preço reads, so a file written before newer keys still parses. */
const committedPricesSchema = z.object({
  products: z.array(z.object({ id: z.string(), priceKrw: productSchema.shape.priceKrw })),
});

async function git(...args: string[]): Promise<string> {
  const { stdout } = await runFile("git", args, { cwd: repoDir, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

/** Oldest first: the commit and its committer date, as `<sha> <ISO date>` lines. */
async function commitsChanging(path: string): Promise<{ sha: string; date: string }[]> {
  const log = await git("log", "--reverse", "--format=%H %cI", ref, "--", path);
  return log
    .trim()
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [sha = "", committedAt = ""] = line.split(" ");
      return { sha, date: new Date(committedAt).toISOString().slice(0, "YYYY-MM-DD".length) };
    });
}

async function backfill(category: CategorySlug): Promise<PriceHistory | null> {
  const path = `public/data/${category}.json`;
  let history: PriceHistory | null = null;
  for (const { sha, date } of await commitsChanging(path)) {
    const committed = committedPricesSchema.parse(JSON.parse(await git("show", `${sha}:${path}`)));
    history = nextPriceHistory(history, { category, products: committed.products }, date);
  }
  return history && priceHistorySchema.parse(history);
}

await mkdir(priceHistoryDir, { recursive: true });
for (const category of categorySlugs) {
  const history = await backfill(category);
  if (!history) {
    console.log(`${category}: nenhum commit em ${ref} mudou public/data/${category}.json.`);
    continue;
  }
  const target = join(priceHistoryDir, `${category}.json`);
  await writeFile(target, `${JSON.stringify(history, null, 2)}\n`);
  const entries = Object.values(history.products).reduce((sum, list) => sum + list.length, 0);
  console.log(
    `${category}: ${Object.keys(history.products).length} Produtos, ${entries} entradas.`,
  );
}
