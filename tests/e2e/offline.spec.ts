import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { metaSchema, type Meta } from "../../src/data/schema.ts";
import { releasePort } from "./e2e-ports.ts";
import { releaseSwitchPath } from "./release-server.ts";

/**
 * Runs against the production build with its service worker, served with the
 * `vercel.json` headers; offline is `browserContext.setOffline(true)`.
 */

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

function updatedAtText(meta: Meta): string {
  return `Atualizado em ${dateFormat.format(new Date(meta.updatedAt))}`;
}

async function fetchMeta(request: APIRequestContext, origin = ""): Promise<Meta> {
  const response = await request.get(`${origin}/data/meta.json`);
  return metaSchema.parse(await response.json());
}

/** Resolves once the service worker precached the app and the data and controls the page. */
async function waitForServiceWorker(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state ?? "none"))
    .toBe("activated");
}

function productRow(page: Page, name: string) {
  return page.getByRole("row").filter({ has: page.getByRole("rowheader", { name }) });
}

test("after one visit, the app opens offline with the data and the date of the last Atualização", async ({
  context,
  page,
  request,
}) => {
  const meta = await fetchMeta(request);
  await page.goto("/mouse?status=todos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("rowheader")).toHaveCount(6);
  await expect(productRow(page, "Dragonfly A9 Ultra ATK")).toContainText("₩ 98.900");
  await expect(page.getByText(updatedAtText(meta))).toBeVisible();

  // Every Categoria's data is precached, not only the one opened.
  await page
    .getByRole("navigation", { name: "Categorias" })
    .getByRole("link", { name: "Monitores" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Monitores");
  // The link opens on Testados: one of the four monitors.
  await expect(page.getByText("1 de 4 produtos")).toBeVisible();
  await expect(page.getByRole("rowheader")).toHaveCount(1);
});

test("offline, a photo seen before still shows and one never seen leaves its space reserved", async ({
  context,
  page,
}) => {
  await page.goto("/mouse?status=todos");
  await waitForServiceWorker(page);
  // The first load ran before the service worker took over; this visit sees the photos through it.
  await page.reload();
  const seenPhoto = productRow(page, "Dragonfly A9 Ultra ATK").locator("img");
  await expect
    .poll(() => seenPhoto.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  // Photos are immutable for the HTTP cache too; with it cleared, only the service worker has them.
  const devtools = await context.newCDPSession(page);
  await devtools.send("Network.clearBrowserCache");
  await context.setOffline(true);
  await page.reload();
  await expect
    .poll(() => seenPhoto.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  // Teclado photos were never loaded: no broken image, the placeholder keeps the row's layout.
  await page
    .getByRole("navigation", { name: "Categorias" })
    .getByRole("link", { name: "Teclados" })
    .click();
  // The link opens on Testados: three of the four teclados.
  await expect(page.getByText("3 de 4 produtos")).toBeVisible();
  await expect(page.getByRole("rowheader")).toHaveCount(3);
  await expect(page.getByRole("main").locator("img")).toHaveCount(0);
});

test("a new Atualização deployed later shows its date the next time the app opens", async ({
  context,
  page,
  request,
}) => {
  const origin = `http://localhost:${releasePort}`;
  await request.post(`${origin}${releaseSwitchPath}current`);
  const currentMeta = await fetchMeta(request, origin);
  await page.goto(`${origin}/mouse`);
  await expect(page.getByText(updatedAtText(currentMeta))).toBeVisible();
  await waitForServiceWorker(page);
  await page.close();

  await request.post(`${origin}${releaseSwitchPath}next`);
  const nextMeta = await fetchMeta(request, origin);
  expect(nextMeta.updatedAt).not.toBe(currentMeta.updatedAt);

  const reopened = await context.newPage();
  await reopened.goto(`${origin}/mouse`);
  await expect(reopened.getByText(updatedAtText(nextMeta))).toBeVisible({ timeout: 15_000 });
});

test("the data and the service worker are never cached for long, so a deploy reaches the next open", async ({
  request,
}) => {
  for (const path of ["/data/meta.json", "/data/mouse.json", "/sw.js"]) {
    const response = await request.get(path);
    expect(response.headers()["cache-control"], path).toBe("public, max-age=0, must-revalidate");
  }
});
