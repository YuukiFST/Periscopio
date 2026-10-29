import { expect, test, type Page } from "@playwright/test";

/**
 * The recorded Fonte excerpt has one Produto in the Fila de testes, Archon M3
 * 600 MAX (teclado, in prévia); the mouses' data is edited on its way in so
 * VK M5 Max THOR is bought and Cloud XS in the lab.
 */

// The data request is edited below; a service worker would answer it from its cache instead.
test.use({ serviceWorkers: "block" });

async function queueMousesInTheLab(page: Page) {
  await page.route("**/data/mouse.json", async (route) => {
    const response = await route.fetch();
    const data: { products: { name: string; status: string | null }[] } = await response.json();
    for (const product of data.products) {
      if (product.name === "VK M5 Max THOR") product.status = "purchased";
      if (product.name === "Cloud XS") product.status = "testing";
    }
    await route.fulfill({ response, json: data });
  });
}

function stage(page: Page, name: RegExp) {
  return page.getByRole("region", { name });
}

test("the Fila de testes lists the Produtos bought, in the lab or in prévia, and narrows to one Categoria", async ({
  page,
}) => {
  await queueMousesInTheLab(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Fila de testes 3 produtos" }).click();
  await expect(page).toHaveURL("/fila");
  await expect(page).toHaveTitle("Fila de testes · Periscópio");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  // Every Categoria shows, so each stage groups its Produtos under a heading per Categoria.
  await expect(stage(page, /^Comprados/).getByRole("heading", { level: 3 })).toHaveText([
    /^Mouses\s*1$/,
  ]);
  await expect(stage(page, /^Comprados/).getByRole("link")).toHaveText([/^VK M5 Max THOR/]);
  await expect(stage(page, /^Recebidos e em teste/).getByRole("heading", { level: 3 })).toHaveText([
    /^Mouses\s*1$/,
  ]);
  await expect(stage(page, /^Recebidos e em teste/).getByRole("link")).toHaveText([/^Cloud XS/]);
  await expect(stage(page, /^Em prévia/).getByRole("heading", { level: 3 })).toHaveText([
    /^Teclados\s*1$/,
  ]);
  await expect(stage(page, /^Em prévia/).getByRole("link")).toHaveText([/^Archon M3 600 MAX/]);

  const queueCategories = page.getByRole("navigation", { name: "Categorias da fila" });
  await expect(queueCategories.getByRole("link", { name: "Todas 3" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await queueCategories.getByRole("link", { name: "Teclados 1" }).click();
  await expect(page).toHaveURL("/fila?categoria=teclado");
  await expect(queueCategories.getByRole("link", { name: "Teclados 1" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(queueCategories.getByRole("link", { name: "Todas 3" })).not.toHaveAttribute(
    "aria-current",
  );
  await expect(stage(page, /^Comprados/)).toContainText("Nenhum produto nesta etapa.");
  await expect(stage(page, /^Recebidos e em teste/)).toContainText("Nenhum produto nesta etapa.");
  await expect(stage(page, /^Em prévia/).getByRole("link")).toHaveText([/^Archon M3 600 MAX/]);
  await expect(stage(page, /^Em prévia/).getByRole("heading", { level: 3 })).toHaveCount(0);

  await stage(page, /^Em prévia/)
    .getByRole("link", { name: /^Archon M3 600 MAX/ })
    .click();
  await expect(page).toHaveURL(/\/fila\/teclado\/[\w-]+\?categoria=teclado$/);
  await expect(page.getByRole("dialog", { name: "Archon M3 600 MAX" })).toBeVisible();
});

test("a Produto of the Fila opens in a side panel over the Fila, which Escape closes", async ({
  page,
}) => {
  await queueMousesInTheLab(page);
  await page.goto("/fila");
  const row = stage(page, /^Comprados/).getByRole("link", { name: /^VK M5 Max THOR/ });
  await row.click();

  await expect(page).toHaveURL(/^[^?]*\/fila\/mouse\/[\w-]+$/);
  await expect(page.getByRole("dialog", { name: "VK M5 Max THOR" })).toBeVisible();
  await expect(page).toHaveTitle("VK M5 Max THOR · Periscópio");
  await expect(page.getByRole("heading", { level: 1, name: "Fila de testes" })).toBeVisible();
  await expect(row).toHaveAttribute("aria-current", "page");
  // No Categoria table holds the marks, so the panel offers no Comparação toggle.
  await expect(page.getByRole("button", { name: "Adicionar à comparação" })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/fila");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveTitle("Fila de testes · Periscópio");
  await expect(row).toBeFocused();
});

test("a link to a Produto of the Fila opens its panel over the Fila", async ({ page }) => {
  await queueMousesInTheLab(page);
  await page.goto("/fila");
  const href = await stage(page, /^Recebidos e em teste/)
    .getByRole("link", { name: /^Cloud XS/ })
    .getAttribute("href");
  await page.goto(href ?? "");

  await expect(page.getByRole("dialog", { name: "Cloud XS" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Cloud XS" })).toBeFocused();
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(page).toHaveURL("/fila");
});
