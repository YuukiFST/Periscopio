import { expect, test, type Page } from "@playwright/test";

/**
 * Runs against the production build whose data comes from two Atualizações
 * of the recorded EyeJoker excerpt (`serve-fixture-build.ts`): the second one
 * adds Dragonfly 3 PRO and VK M5 Max THOR (not tested) and marks H200A as
 * tested, so those three mouses are the Novidades; teclados and monitores have none.
 */

async function productNames(page: Page): Promise<string[]> {
  const rowHeaders = await page.getByRole("rowheader").allInnerTexts();
  return rowHeaders.map((text) => text.split("\n")[0] ?? "");
}

function productRow(page: Page, name: string) {
  return page.getByRole("row").filter({ has: page.getByRole("rowheader", { name }) });
}

function novidadesToggle(page: Page) {
  return page.getByRole("button", { name: "Novidades", exact: true });
}

test("the table marks the Produtos new in the last Atualização and the one tested in it", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  await expect(page.getByRole("rowheader")).toHaveCount(6);

  for (const name of ["Dragonfly 3 PRO", "VK M5 Max THOR"]) {
    await expect(productRow(page, name).getByText("Novo", { exact: true })).toBeVisible();
  }
  await expect(productRow(page, "H200A").getByText("Testado agora", { exact: true })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByText("Novo", { exact: true })).toHaveCount(2);
  await expect(table.getByText("Testado agora", { exact: true })).toHaveCount(1);
});

test("the Novidades toggle keeps only the marked Produtos, with the other Filtros, and lives in the link", async ({
  page,
}) => {
  await page.goto("/mouse");
  await expect(page.getByRole("rowheader")).toHaveCount(4);
  await expect(novidadesToggle(page)).toHaveAttribute("aria-pressed", "false");

  await novidadesToggle(page).click();
  await expect(novidadesToggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/[?&]novidades=1(&|$)/);
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly 3 PRO", "H200A"]);
  await expect(page.getByText("2 de 6 produtos")).toBeVisible();

  // Peso up to 60 g leaves out H200A (102 g).
  await page.goto("/mouse?novidades=1&peso=-60");
  await expect(novidadesToggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly 3 PRO"]);

  await novidadesToggle(page).click();
  await expect(page).not.toHaveURL(/novidades=/);
  await expect
    .poll(() => productNames(page))
    .toEqual(["Dragonfly A9 Ultra", "Huan", "Dragonfly 3 PRO"]);
});

test("a Categoria without Novidades shows no badge and no toggle", async ({ page }) => {
  await page.goto("/teclado?status=todos");
  await expect(page.getByRole("rowheader")).toHaveCount(4);
  await expect(novidadesToggle(page)).toHaveCount(0);
  await expect(page.getByRole("table").getByText("Novo", { exact: true })).toHaveCount(0);
});
