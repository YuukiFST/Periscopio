import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";

const runFile = promisify(execFile);
const viteBin = join(import.meta.dirname, "../../node_modules/vite/bin/vite.js");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("vite build emits a static app that stays out of search engines", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "eyejoker-build-"));
  tempDirs.push(outDir);

  await runFile(process.execPath, [viteBin, "build", "--outDir", outDir, "--emptyOutDir"]);

  const indexHtml = await readFile(join(outDir, "index.html"), "utf8");
  const robotsTxt = await readFile(join(outDir, "robots.txt"), "utf8");
  expect(indexHtml).toContain('<meta name="robots" content="noindex" />');
  expect(indexHtml).toMatch(/<script type="module" crossorigin src="\/assets\/index-[\w-]+\.js">/);
  expect(robotsTxt).toBe("User-agent: *\nDisallow: /\n");
});
