import { defineConfig, devices } from "@playwright/test";

const previewPort = 4173;

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
    command: `pnpm build && pnpm preview --port ${previewPort} --strictPort`,
    url: `http://localhost:${previewPort}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
