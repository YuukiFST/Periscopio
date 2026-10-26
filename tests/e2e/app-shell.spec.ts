import { expect, test, type Page } from "@playwright/test";

const huanId = "201270eb-b392-4e41-96a9-1b609a77e795";

/** The Novidades come with the Categorias' Produtos, after the cards; the fixture's are 3 mouses. */
function mouseNovidadesLink(page: Page) {
  return page.getByRole("main").getByRole("link", { name: "3 novidades" });
}

test("/ opens the home page, and the header switches between the three categories", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Periscópio");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Periscópio");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(mouseNovidadesLink(page)).toBeVisible();
  await expect(page.getByRole("main")).toMatchAriaSnapshot({ name: "home-page.aria.yml" });
  await expect(page.getByRole("banner")).toMatchAriaSnapshot({ name: "app-shell-header.aria.yml" });

  const categoryNav = page.getByRole("navigation", { name: "Categorias" });
  await categoryNav.getByRole("link", { name: "Mouses" }).click();
  await expect(page).toHaveURL("/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");

  await categoryNav.getByRole("link", { name: "Teclados" }).click();
  await expect(page).toHaveURL("/teclado");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");

  await categoryNav.getByRole("link", { name: "Monitores" }).click();
  await expect(page).toHaveURL("/monitor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Monitores");

  await page.getByRole("banner").getByRole("link", { name: "Periscópio" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("a Categoria card opens its table, and its Novidades link opens the table with only them", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Teclados" }).click();
  await expect(page).toHaveURL("/teclado");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");

  await page.goBack();
  await mouseNovidadesLink(page).click();
  await expect(page).toHaveURL("/mouse?novidades=1&status=todos");
  await expect(page.getByRole("button", { name: "Novidades", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // VK M5 Max THOR is not tested yet, and still counts.
  await expect(page.getByRole("rowheader")).toHaveCount(3);
});

test("the home page lists the Produtos seen last, and opens one", async ({ page }) => {
  await page.goto("/");
  await expect(mouseNovidadesLink(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vistos recentemente" })).toHaveCount(0);

  await page.goto(`/mouse/${huanId}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await page.goto("/");
  const recentSection = page.getByRole("region", { name: "Vistos recentemente" });
  await expect(recentSection.getByRole("link")).toHaveText([/^Huan\s*Mouses/]);

  await recentSection.getByRole("link", { name: /^Huan/ }).click();
  await expect(page).toHaveURL(`/mouse/${huanId}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
});

test("on a phone the Categoria cards stack in one column, and the installed app opens on the home page", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const cards = page.getByRole("main").getByRole("listitem");
  await expect(cards).toHaveCount(3);
  const boxes = await Promise.all((await cards.all()).map((card) => card.boundingBox()));
  const lefts = new Set(boxes.map((box) => box?.x));
  expect(lefts.size).toBe(1);
  const tops = boxes.map((box) => box?.y ?? Number.NaN);
  expect(tops).toEqual(tops.toSorted((a, b) => a - b));
  expect(new Set(tops).size).toBe(3);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(manifestHref ?? "")).json();
  expect(manifest.start_url).toBe("/");
});

test("a deep link to a category loads directly, and an unknown path shows not found", async ({
  page,
}) => {
  await page.goto("/teclado");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");

  await page.goto("/fones");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
});

test("every response tells search engines to stay out", async ({ page, request }) => {
  const robotsResponse = await request.get("/robots.txt");
  expect(await robotsResponse.text()).toBe("User-agent: *\nDisallow: /\n");
  expect(robotsResponse.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  const pageResponse = await page.goto("/mouse");
  expect(pageResponse?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("the theme follows the system color scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/mouse");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});
