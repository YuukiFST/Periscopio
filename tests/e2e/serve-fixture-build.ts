/**
 * Playwright's web server: builds the app for production with data the
 * pipeline generates from the recorded EyeJoker excerpt, then serves it with
 * `vite preview`. Assertions stay deterministic because the data is the same
 * few Products on every run; `pnpm build` keeps using `public/`.
 */
import { execFile, spawn } from "node:child_process";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  loadRecordedRoutes,
  startRecordedEyejokerServer,
} from "../pipeline/recorded-eyejoker-server.ts";

const runFile = promisify(execFile);
const repoDir = join(import.meta.dirname, "../..");
/** Build output like `dist/`, git-ignored and rebuilt from scratch on every run. */
const e2eDir = join(repoDir, "dist-e2e");
const publicDir = join(e2eDir, "public");
const outDir = join(e2eDir, "dist");
const viteBin = join(repoDir, "node_modules/vite/bin/vite.js");
const updateCli = join(repoDir, "pipeline/update-data.ts");
const port = process.argv[2] ?? "4173";

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
    EYEJOKER_OUT_DIR: publicDir,
  };
  delete env.GITHUB_STEP_SUMMARY;
  try {
    await runFile(process.execPath, [updateCli], { env });
  } finally {
    await server.close();
  }
}

await rm(e2eDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
await copyStaticPublicFiles();
await generateFixtureData();
await runFile(process.execPath, [viteBin, "build", "--outDir", outDir, "--emptyOutDir"], {
  cwd: repoDir,
  env: { ...process.env, EYEJOKER_PUBLIC_DIR: publicDir },
});

const preview = spawn(
  process.execPath,
  [viteBin, "preview", "--outDir", outDir, "--port", port, "--strictPort"],
  { cwd: repoDir, stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => preview.kill(signal));
}
preview.on("exit", (code) => process.exit(code ?? 0));
