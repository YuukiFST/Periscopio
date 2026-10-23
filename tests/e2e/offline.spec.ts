import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { metaSchema, type Meta } from "../../src/data/schema.ts";
import { releasePort } from "./e2e-ports.ts";
import { releaseSwitchPath } from "./release-server.ts";

/**
 * Runs against the production build with its service worker, served with the
 * `vercel.json` headers; offline is `browserContext.setOffline(true)`.
 */

// The release origin serves one build at a time for every test, so the tests that switch it take turns.
test.describe.configure({ mode: "default" });

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

test("a new Atualização with Novidades shows how many since the last visit, and Ver novidades lists them", async ({
  context,
  page,
  request,
}) => {
  const origin = `http://localhost:${releasePort}`;
  const noticeText = "1 produto novo e 1 testado desde sua última visita";
  await request.post(`${origin}${releaseSwitchPath}current`);
  const currentMeta = await fetchMeta(request, origin);
  await page.goto(`${origin}/mouse`);
  await expect(page.getByText(updatedAtText(currentMeta))).toBeVisible();
  // The first visit has nothing to compare with.
  await expect(page.getByText(/desde sua última visita/)).toHaveCount(0);
  await waitForServiceWorker(page);
  await page.close();

  await request.post(`${origin}${releaseSwitchPath}next`);
  const nextMeta = await fetchMeta(request, origin);
  const reopened = await context.newPage();
  await reopened.goto(`${origin}/mouse`);
  await expect(reopened.getByText(updatedAtText(nextMeta))).toBeVisible({ timeout: 15_000 });
  await expect(reopened.getByText(noticeText)).toBeVisible();

  await reopened.getByRole("button", { name: "Ver novidades" }).click();
  await expect(reopened.getByText(noticeText)).toHaveCount(0);
  const toggle = reopened.getByRole("button", { name: "Novidades", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toBeFocused();
  await expect(reopened).toHaveURL(/[?&]novidades=1(&|$)/);
  // The two counted (Huan Pro, VK M5 Max THOR) and the two of the Atualização before, still in the 14 days.
  await expect(reopened.getByRole("rowheader")).toHaveCount(4);

  // This visit saw the next Atualização, so opening the app again shows no notice.
  await reopened.goto(`${origin}/mouse`);
  await expect(reopened.getByText(updatedAtText(nextMeta))).toBeVisible();
  await expect(reopened.getByText(/desde sua última visita/)).toHaveCount(0);
});

test("the Novidades notice closes and gives focus back to the search", async ({
  context,
  page,
  request,
}) => {
  const origin = `http://localhost:${releasePort}`;
  await request.post(`${origin}${releaseSwitchPath}current`);
  await page.goto(`${origin}/mouse`);
  await waitForServiceWorker(page);
  await page.close();

  await request.post(`${origin}${releaseSwitchPath}next`);
  const reopened = await context.newPage();
  await reopened.goto(`${origin}/mouse`);
  const notice = reopened.getByText("1 produto novo e 1 testado desde sua última visita");
  await expect(notice).toBeVisible({ timeout: 15_000 });

  await reopened.getByRole("button", { name: "Fechar aviso" }).click();
  await expect(notice).toHaveCount(0);
  await expect(
    reopened.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }),
  ).toBeFocused();
  await expect(reopened).not.toHaveURL(/novidades=/);
});

test("the data and the service worker are never cached for long, so a deploy reaches the next open", async ({
  request,
}) => {
  for (const path of ["/data/meta.json", "/data/mouse.json", "/sw.js"]) {
    const response = await request.get(path);
    expect(response.headers()["cache-control"], path).toBe("public, max-age=0, must-revalidate");
  }
});
