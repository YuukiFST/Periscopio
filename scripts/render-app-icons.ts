/**
 * Renders the PNG app icons from `public/favicon.svg` with Playwright's
 * Chromium. Run once after changing the SVG: `node scripts/render-app-icons.ts`.
 * The maskable and Apple icons fill the rounded corners with the icon blue,
 * because the platform crops them to its own shape.
 */
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const publicDir = join(import.meta.dirname, "../public");
const iconBlue = "#0090ff";

const icons = [
  { file: "pwa-192.png", size: 192, background: "transparent" },
  { file: "pwa-512.png", size: 512, background: "transparent" },
  { file: "pwa-maskable-512.png", size: 512, background: iconBlue },
  { file: "apple-touch-icon.png", size: 180, background: iconBlue },
];

const svg = await readFile(join(publicDir, "favicon.svg"), "utf8");
const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const browser = await chromium.launch();
try {
  for (const icon of icons) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
    await page.setContent(
      `<style>html,body{margin:0;background:${icon.background}}img{display:block}</style>` +
        `<img src="${svgDataUrl}" width="${icon.size}" height="${icon.size}">`,
    );
    await page.locator("img").evaluate((image: HTMLImageElement) => image.decode());
    await page.screenshot({ path: join(publicDir, icon.file), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
