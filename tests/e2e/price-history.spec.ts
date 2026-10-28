import { expect, test, type Page } from "@playwright/test";

/**
 * Runs against the production build whose mouse Histórico de preço starts
 * three weeks back (`serve-fixture-build.ts`): Huan went ₩ 280.000, 290.000,
 * 272.000 and now 239.000; Cloud XS went 150.000 and now 162.000; every other
 * Produto has today's Preço only.
 */

const huanId = "201270eb-b392-4e41-96a9-1b609a77e795";
const cloudXsId = "1f2e9ba6-5ac5-4f0d-b986-7cb4203b5d6c";
const dragonflyA9UltraId = "003586ba-0cbf-4932-843c-24e5f56e47c2";

function priceHistoryChart(page: Page) {
  return page.getByRole("img", { name: /^Histórico de preço/ });
}

function priceHistorySection(page: Page) {
  return page.getByRole("region", { name: "Histórico de preço" });
}

/** The Histórico de preço paths the service worker holds, precached or cached once fetched. */
function cachedPriceHistoryPaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) {
        const { pathname } = new URL(request.url);
        if (pathname.startsWith("/data/precos/")) paths.push(pathname);
      }
    }
    return paths;
  });
}

function priceFact(page: Page) {
  return page.getByRole("definition").filter({ hasText: "₩" });
}

test("the detail shows the Histórico de preço in its own section, with the lowest and highest Preço, both labels and each entry under the pointer", async ({
  page,
}) => {
  await page.goto(`/mouse/${huanId}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await expect(priceHistoryChart(page)).toHaveAccessibleName(/^Histórico de preço: 4 preços de /);
  await expect(priceHistorySection(page)).toContainText("máx. ₩ 290.000");
  await expect(priceHistorySection(page)).toContainText("mín. ₩ 239.000");
  await expect(
    page.getByRole("listitem").filter({ hasText: /^Menor preço em 3 semanas$/ }),
  ).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /^Caiu 12%$/ })).toBeVisible();

  // The first entry sits at the left edge, the last at the right one.
  await priceHistoryChart(page).hover({ position: { x: 2, y: 40 } });
  await expect(page.getByRole("tooltip")).toHaveText(/^\d+\sde\s\S+\sde\s\d{4}₩\s280\.000$/);
  const box = await priceHistoryChart(page).boundingBox();
  await priceHistoryChart(page).hover({ position: { x: (box?.width ?? 0) - 2, y: 40 } });
  await expect(page.getByRole("tooltip")).toHaveText(/₩\s239\.000caiu\s12,1%$/);
});

test("a Preço that rose shows the sparkline without labels, and one Preço alone shows none", async ({
  page,
}) => {
  await page.goto(`/mouse/${cloudXsId}`);
  await expect(page.getByRole("dialog", { name: "Cloud XS" })).toBeVisible();
  await expect(priceHistoryChart(page)).toHaveAccessibleName(/^Histórico de preço: 2 preços de /);
  await expect(page.getByText(/^(Menor preço em|Caiu)/)).toHaveCount(0);

  await page.goto(`/mouse/${dragonflyA9UltraId}`);
  await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();
  await expect(priceFact(page)).toContainText("₩ 98.900");
  await expect(priceHistoryChart(page)).toHaveCount(0);
});

test("the Histórico de preço loads only when a detail opens, and shows offline after that", async ({
  context,
  page,
}) => {
  const priceHistoryRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/data/precos/"))
      priceHistoryRequests.push(request.url());
  });
  await page.goto("/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state ?? "none"))
    .toBe("activated");
  expect(priceHistoryRequests).toEqual([]);
  expect(await cachedPriceHistoryPaths(page)).toEqual([]);

  await page.getByRole("link", { name: "Detalhes de Huan" }).click({ position: { x: 56, y: 16 } });
  await expect(priceHistoryChart(page)).toBeVisible();
  expect(priceHistoryRequests.map((url) => new URL(url).pathname)).toContain(
    "/data/precos/mouse.json",
  );
  await expect.poll(() => cachedPriceHistoryPaths(page)).toEqual(["/data/precos/mouse.json"]);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await expect(priceHistoryChart(page)).toBeVisible();
  await expect(page.getByText("Caiu 12%")).toBeVisible();
});
