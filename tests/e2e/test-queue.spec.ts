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

  await expect(stage(page, /^Comprados/).getByRole("link")).toHaveText([
    /^VK M5 Max THOR\s*Mouses/,
  ]);
  await expect(stage(page, /^Recebidos e em teste/).getByRole("link")).toHaveText([
    /^Cloud XS\s*Mouses/,
  ]);
  await expect(stage(page, /^Em prévia/).getByRole("link")).toHaveText([
    /^Archon M3 600 MAX\s*Teclados/,
  ]);

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

  await stage(page, /^Em prévia/)
    .getByRole("link", { name: /^Archon M3 600 MAX/ })
    .click();
  await expect(page).toHaveURL(/\/teclado\/[\w-]+$/);
  await expect(page.getByRole("dialog", { name: "Archon M3 600 MAX" })).toBeVisible();
});
