import { expect, test, type Page, type Route } from "@playwright/test";

/** Holds every request for the mouse data until the returned function runs. */
async function holdMouseData(page: Page): Promise<() => Promise<void>> {
  const heldRoutes: Route[] = [];
  let isHeld = true;
  await page.route("**/data/mouse.json", async (route) => {
    if (isHeld) heldRoutes.push(route);
    else await route.continue();
  });
  return async () => {
    isHeld = false;
    await Promise.all(heldRoutes.map((route) => route.continue()));
  };
}

const loadingViews = [
  {
    view: "Categoria",
    path: "/mouse",
    status: "Carregando produtos…",
    loaded: (page: Page) => page.getByRole("rowheader").first(),
  },
  {
    view: "Comparação",
    path: "/comparar/mouse?p=003586ba-0cbf-4932-843c-24e5f56e47c2,201270eb-b392-4e41-96a9-1b609a77e795",
    status: "Carregando comparação…",
    loaded: (page: Page) => page.getByRole("columnheader", { name: "Dragonfly A9 Ultra" }),
  },
  {
    view: "Gráfico",
    path: "/grafico/mouse",
    status: "Carregando gráfico…",
    loaded: (page: Page) => page.getByRole("link", { name: /^Huan: / }),
  },
];

test.describe("while the data loads", () => {
  // The data request is held below; a service worker would answer it from its cache instead.
  test.use({ serviceWorkers: "block" });

  for (const { view, path, status, loaded } of loadingViews) {
    test(`the ${view} shows a skeleton and its status, then the data`, async ({ page }) => {
      const release = await holdMouseData(page);
      await page.goto(path);

      // The shapes are hidden from screen readers; they are all the main area holds while loading.
      const skeleton = page.getByRole("main").locator('[aria-hidden="true"]');
      await expect(page.getByRole("status")).toHaveText(status);
      await expect(skeleton).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);

      await release();
      await expect(loaded(page)).toBeVisible();
      await expect(page.getByText(status)).toHaveCount(0);
    });
  }

  for (const { reducedMotion, pulses } of [
    { reducedMotion: "no-preference", pulses: true },
    { reducedMotion: "reduce", pulses: false },
  ] as const) {
    test(`the skeleton ${pulses ? "pulses" : "stays still"} with reduced motion ${reducedMotion}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      const release = await holdMouseData(page);
      await page.goto("/mouse");
      await expect(page.getByRole("status")).toHaveText("Carregando produtos…");

      const runningAnimations = await page
        .getByRole("main")
        .locator('[aria-hidden="true"]')
        .evaluate((skeleton) => skeleton.getAnimations({ subtree: true }).length);
      expect(runningAnimations > 0).toBe(pulses);
      await release();
    });
  }
});
