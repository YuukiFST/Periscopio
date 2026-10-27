import { expect, test, type Page } from "@playwright/test";

/**
 * The Favoritos over the fixture build (`serve-fixture-build.ts`): 6 mouses,
 * 4 of them tested.
 */

const storageKey = "periscopio:favoritos:mouse";
const dragonflyA9UltraId = "003586ba-0cbf-4932-843c-24e5f56e47c2";
/** A well-formed id no Produto of the fixture has, as if a later Atualização dropped it. */
const missingProductId = "11111111-2222-4333-8444-555555555555";

async function productNames(page: Page): Promise<string[]> {
  const rowHeaders = await page.getByRole("rowheader").allInnerTexts();
  return rowHeaders.map((text) => text.split("\n")[0] ?? "");
}

function onlyFavoritesToggle(page: Page) {
  return page.getByRole("button", { name: "Só favoritos" });
}

function storedFavorites(page: Page): Promise<unknown> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), storageKey);
}

test("a row's star marks the Produto as a Favorito, and Só favoritos keeps only those, with the busca, across an offline reload", async ({
  context,
  page,
}) => {
  await page.goto("/mouse");
  await expect(page.getByRole("rowheader")).toHaveCount(4);
  const star = page.getByRole("button", { name: "Favoritar Huan" });
  await expect(star).toHaveAttribute("aria-pressed", "false");

  await star.click();
  const starred = page.getByRole("rowheader", { name: /^Huan/ }).getByRole("button");
  await expect(starred).toHaveAccessibleName("Remover dos favoritos");
  await expect(starred).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Favoritar Dragonfly A9 Ultra" }).click();

  await onlyFavoritesToggle(page).click();
  await expect(onlyFavoritesToggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/[?&]favoritos=1(&|$)/);
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly A9 Ultra", "Huan"]);
  await expect(page.getByText("2 de 6 produtos")).toBeVisible();

  await page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }).fill("huan");
  await expect.poll(() => productNames(page)).toEqual(["Huan"]);

  // Once the service worker controls the page, the app and the Favoritos open without a network.
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state ?? "none"))
    .toBe("activated");
  await context.setOffline(true);
  await page.reload();
  await expect(onlyFavoritesToggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => productNames(page)).toEqual(["Huan"]);

  // Unstarring the last shown Favorito empties the result, which names the toggle.
  await page.getByRole("button", { name: "Remover dos favoritos" }).click();
  await expect(
    page.getByText("Nenhum produto favorito testado encontrado para “huan”."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mostrar todos os produtos" }).click();
  await expect(page).not.toHaveURL(/favoritos=/);
  await expect(page.getByRole("rowheader")).toHaveCount(6);
  await expect(onlyFavoritesToggle(page)).toHaveAttribute("aria-pressed", "false");
});

test("Só favoritos with none starred says so and keeps the way back to every Produto", async ({
  page,
}) => {
  await page.goto("/mouse?favoritos=1");
  await expect(page.getByText("Nenhum produto favorito testado nesta categoria.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mostrar todos os produtos" })).toBeVisible();
});

test("the detail's star and the table's are one Favorito, kept after a reload", async ({
  page,
}) => {
  await page.goto(`/mouse/${dragonflyA9UltraId}`);
  const panel = page.getByRole("dialog", { name: "Dragonfly A9 Ultra" });
  await panel.getByRole("button", { name: "Favoritar Dragonfly A9 Ultra" }).click();
  const starred = panel.getByRole("button", { name: "Remover dos favoritos" });
  await expect(starred).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(
    page
      .getByRole("dialog", { name: "Dragonfly A9 Ultra" })
      .getByRole("button", { name: "Remover dos favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(
    page.getByRole("rowheader", { name: /^Dragonfly A9 Ultra/ }).getByRole("button"),
  ).toHaveAttribute("aria-pressed", "true");

  // Unstarred in the table, the detail follows.
  await page
    .getByRole("rowheader", { name: /^Dragonfly A9 Ultra/ })
    .getByRole("button")
    .click();
  await page.getByRole("link", { name: "Detalhes de Dragonfly A9 Ultra" }).click({
    position: { x: 56, y: 16 },
  });
  await expect(
    page
      .getByRole("dialog", { name: "Dragonfly A9 Ultra" })
      .getByRole("button", { name: "Favoritar Dragonfly A9 Ultra" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("a stored id the data lacks is ignored and kept, and text that is not an id is dropped", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, ids }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(ids));
    },
    { key: storageKey, ids: [missingProductId, "nao-e-um-id", dragonflyA9UltraId] },
  );
  await page.goto("/mouse?favoritos=1");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly A9 Ultra"]);
  await expect(page.getByText("1 de 6 produtos")).toBeVisible();

  // Starring another Produto rewrites the list and keeps the id the data lacks.
  await onlyFavoritesToggle(page).click();
  await page.getByRole("button", { name: "Favoritar Huan" }).click();
  await expect
    .poll(() => storedFavorites(page))
    .toEqual([missingProductId, dragonflyA9UltraId, expect.stringMatching(/^[0-9a-f-]{36}$/)]);
});

test("on a star, j steps to the next row's star, Enter stars without opening the detail, and an unstarred row hands focus on", async ({
  page,
}) => {
  await page.goto("/mouse");
  await expect(page.getByRole("rowheader")).toHaveCount(4);
  const [first, second] = await productNames(page);
  const firstStar = page.getByRole("button", { name: `Favoritar ${first}` });
  await firstStar.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/mouse");
  await page.keyboard.press("j");
  const secondStar = page.getByRole("button", { name: `Favoritar ${second}` });
  await expect(secondStar).toBeFocused();
  await page.keyboard.press("Enter");

  await onlyFavoritesToggle(page).click();
  await expect.poll(() => productNames(page)).toEqual([first, second]);
  const starred = page.getByRole("button", { name: "Remover dos favoritos" });
  await starred.first().focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => productNames(page)).toEqual([second]);
  await expect(starred).toBeFocused();

  // With the last Favorito gone, the toggle that hid the rows takes focus.
  await page.keyboard.press("Enter");
  await expect(page.getByText("Nenhum produto favorito testado nesta categoria.")).toBeVisible();
  await expect(onlyFavoritesToggle(page)).toBeFocused();
});

test("the Gráfico opened with Só favoritos plots only the Favoritos and says so", async ({
  page,
}) => {
  await page.goto("/mouse");
  await page.getByRole("button", { name: "Favoritar Huan" }).click();
  await onlyFavoritesToggle(page).click();
  await page.getByRole("link", { name: "Ver gráfico" }).click();
  await expect(page).toHaveURL(/\/grafico\/mouse\?.*favoritos=1/);
  const chartRows = page.getByRole("table", { name: "Dados do gráfico" }).getByRole("row");
  await expect(chartRows).toHaveCount(2);
  await expect(chartRows.nth(1)).toContainText("Huan");
  await expect(page.getByText(/Testados · Favoritos/)).toBeVisible();
});
