/**
 * Playwright's web server: builds the app for production with data the
 * pipeline generates from the recorded EyeJoker excerpt, then serves it with
 * `vite preview`. Assertions stay deterministic because the data is the same
 * few Products on every run; `pnpm build` keeps using `public/`.
 *
 * It also builds the next Atualização (the same data, `meta.json` a week
 * later) and serves both builds at the release origin (`release-server.ts`),
 * where the update test switches from one deploy to the next.
 */
import { execFile, spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { metaSchema } from "../../src/data/schema.ts";
import {
  loadRecordedRoutes,
  startRecordedEyejokerServer,
} from "../pipeline/recorded-eyejoker-server.ts";
import { nextBuildPort, previewPort, releasePort } from "./e2e-ports.ts";
import { startReleaseServer } from "./release-server.ts";

const runFile = promisify(execFile);
const repoDir = join(import.meta.dirname, "../..");
/** Build output like `dist/`, git-ignored and rebuilt from scratch on every run. */
const e2eDir = join(repoDir, "dist-e2e");
const publicDir = join(e2eDir, "public");
const outDir = join(e2eDir, "dist");
const nextPublicDir = join(e2eDir, "next/public");
const nextOutDir = join(e2eDir, "next/dist");
const viteBin = join(repoDir, "node_modules/vite/bin/vite.js");
const updateCli = join(repoDir, "pipeline/update-data.ts");
const weekMs = 7 * 24 * 60 * 60 * 1000;

/** Everything in `public/` but the real data and photos, which the pipeline replaces. */
async function copyStaticPublicFiles(): Promise<void> {
  for (const entry of await readdir(join(repoDir, "public"))) {
    if (entry === "data" || entry === "images") continue;
    await cp(join(repoDir, "public", entry), join(publicDir, entry), { recursive: true });
  }
}

async function generateFixtureData(): Promise<void> {
  const server = await startRecordedEyejokerServer(await loadRecordedRoutes());
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    EYEJOKER_API_URL: server.apiUrl,
    EYEJOKER_CDN_URL: server.cdnUrl,
    FRANKFURTER_API_URL: server.frankfurterUrl,
    EYEJOKER_OUT_DIR: publicDir,
  };
  delete env.GITHUB_STEP_SUMMARY;
  try {
    await runFile(process.execPath, [updateCli], { env });
  } finally {
    await server.close();
  }
}

/** The next weekly Atualização: the same Products, dated a week later. */
async function writeNextAtualizacao(): Promise<void> {
  await cp(publicDir, nextPublicDir, { recursive: true });
  const metaPath = join(nextPublicDir, "data/meta.json");
  const meta = metaSchema.parse(JSON.parse(await readFile(metaPath, "utf8")));
  const updatedAt = new Date(Date.parse(meta.updatedAt) + weekMs).toISOString();
  await writeFile(metaPath, `${JSON.stringify({ ...meta, updatedAt }, null, 2)}\n`);
}

async function buildApp(appPublicDir: string, appOutDir: string): Promise<void> {
  await runFile(process.execPath, [viteBin, "build", "--outDir", appOutDir, "--emptyOutDir"], {
    cwd: repoDir,
    env: { ...process.env, EYEJOKER_PUBLIC_DIR: appPublicDir },
  });
}

function startPreview(appOutDir: string, port: number) {
  return spawn(
    process.execPath,
    [viteBin, "preview", "--outDir", appOutDir, "--port", String(port), "--strictPort"],
    { cwd: repoDir, stdio: "inherit" },
  );
}

/** Playwright waits on the main preview only, so the servers behind it start first. */
async function waitUntilServing(port: number): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const serving = await fetch(`http://localhost:${port}/`).then(
      (response) => response.ok,
      () => false,
    );
    if (serving) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`vite preview on port ${port} did not answer within 20 s`);
}

await rm(e2eDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
await copyStaticPublicFiles();
await generateFixtureData();
await writeNextAtualizacao();
await buildApp(publicDir, outDir);
await buildApp(nextPublicDir, nextOutDir);

const nextPreview = startPreview(nextOutDir, nextBuildPort);
await waitUntilServing(nextBuildPort);
await startReleaseServer(releasePort, { current: previewPort, next: nextBuildPort });
const previews = [nextPreview, startPreview(outDir, previewPort)];
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    for (const preview of previews) preview.kill(signal);
  });
}
for (const preview of previews) {
  preview.on("exit", (code) => {
    for (const other of previews) other.kill();
    process.exit(code ?? 0);
  });
}
