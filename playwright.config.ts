import { defineConfig, devices } from "@playwright/test";

const previewPort = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${previewPort}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node tests/e2e/serve-fixture-build.ts ${previewPort}`,
    url: `http://localhost:${previewPort}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
