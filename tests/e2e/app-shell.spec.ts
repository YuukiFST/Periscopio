import { expect, test } from "@playwright/test";

test("/ redirects to mouses and the header switches between the three categories", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL("/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");
  await expect(page.getByRole("banner")).toMatchAriaSnapshot({ name: "app-shell-header.aria.yml" });

  const categoryNav = page.getByRole("navigation", { name: "Categorias" });
  await categoryNav.getByRole("link", { name: "Teclados" }).click();
  await expect(page).toHaveURL("/teclado");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");

  await categoryNav.getByRole("link", { name: "Monitores" }).click();
  await expect(page).toHaveURL("/monitor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Monitores");
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
