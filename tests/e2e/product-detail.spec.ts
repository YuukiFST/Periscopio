import { expect, test } from "@playwright/test";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded EyeJoker excerpt (`serve-fixture-build.ts`).
 */

const dragonflyA9UltraId = "003586ba-0cbf-4932-843c-24e5f56e47c2";
/** A mouse EyeJoker lists without Medições, photo, Preço or AliExpress link. */
const vkM5MaxThorId = "0fbec015-8d94-469d-993e-1d9d5138fb9b";

test("a Produto opened from the table shows its header and fields grouped in pt in the side panel, and closing it leaves the table as it was", async ({
  page,
}) => {
  // `outro` stands for any param the table reads: the detail screen keeps them all, not a list.
  const tableSearch = "?ordem=-peso&status=testados&q=dragon&outro=1";
  await page.goto(`/mouse${tableSearch}`);
  // On the photo: the name in the middle of the cell is the AliExpress link.
  await page
    .getByRole("link", { name: "Detalhes de Dragonfly A9 Ultra" })
    .click({ position: { x: 16, y: 16 } });

  await expect(page).toHaveURL(`/mouse/${dragonflyA9UltraId}${tableSearch}`);
  await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");
  await expect(page).toHaveTitle("Dragonfly A9 Ultra · Periscópio");
  await expect(page.getByRole("link", { name: "Ver no AliExpress" })).toHaveAttribute(
    "href",
    "https://s.click.aliexpress.com/e/_oFLhAg6",
  );
  await expect(page.getByRole("article")).toMatchAriaSnapshot({ name: "mouse-detail.aria.yml" });
  await expect(page.getByRole("article")).toMatchAriaSnapshot(`
    - term: Preço
    - definition: ₩ 98.900 cerca de R$ 377 (Cotação de 22 de out. de 2026)
  `);
  await expect(page.getByRole("region", { name: "Especificações" })).toMatchAriaSnapshot(`
    - term: Nota geral
    - definition: A+
    - term: Formato
    - definition: Simétrico
    - term: Peso
    - definition: 54 g
  `);
  await expect(page.getByRole("region", { name: "Medições" })).toMatchAriaSnapshot(`
    - term: Resposta do sensor
    - definition: 0,70 ms
    - term: Resposta do clique
    - definition: 0,49 ms
  `);

  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(page).toHaveURL(`/mouse${tableSearch}`);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveTitle("Mouses · Periscópio");
  await expect(
    page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }),
  ).toHaveValue("dragon");
  await expect(page.getByRole("radio", { name: "Testados", exact: true })).toBeChecked();
  await expect(page.getByRole("columnheader", { name: "Peso" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("the side panel leaves the table usable: another row takes the panel, a sort keeps it, and Escape hands focus back to the row", async ({
  page,
}) => {
  const huanId = "201270eb-b392-4e41-96a9-1b609a77e795";
  await page.goto("/mouse?ordem=-peso");
  await page.getByRole("link", { name: "Detalhes de Huan" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Huan", level: 2 })).toBeFocused();

  await page
    .getByRole("link", { name: "Detalhes de Dragonfly A9 Ultra" })
    .click({ position: { x: 16, y: 16 } });
  await expect(page).toHaveURL(`/mouse/${dragonflyA9UltraId}?ordem=-peso`);
  await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();

  await page.getByRole("columnheader", { name: "Preço" }).getByRole("button").click();
  await expect(page).toHaveURL(`/mouse/${dragonflyA9UltraId}?ordem=preco`);
  await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();

  await page.getByRole("link", { name: "Detalhes de Huan" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/mouse/${huanId}?ordem=preco`);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/mouse?ordem=preco");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Detalhes de Huan" })).toBeFocused();
});

test("a Produto without Medições shows no Medições group, and says what is missing", async ({
  page,
}) => {
  await page.goto(`/mouse/${vkM5MaxThorId}`);
  await expect(page.getByRole("dialog", { name: "VK M5 Max THOR" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Especificações" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Medições" })).toHaveCount(0);
  await expect(
    page.getByText("O EyeJoker ainda não publicou medições deste produto."),
  ).toBeVisible();
  await expect(page.getByRole("article")).toMatchAriaSnapshot(`
    - heading "VK M5 Max THOR" [level=2]
    - paragraph: VALKYRIE
    - term: Preço
    - definition: Sem preço
    - term: Status de teste
    - definition: Sugerido
  `);
  await expect(page.getByRole("link", { name: "Ver no AliExpress" })).toHaveCount(0);
  // Without a Preço it has no distance to any Produto, so there is nothing to compare it with.
  await expect(page.getByRole("link", { name: "Comparar com parecidos" })).toHaveCount(0);
});

test("Comparar com parecidos opens a Comparação of the Produto and the 3 nearest tested ones, nearest first", async ({
  page,
}) => {
  const nearestToDragonflyA9Ultra = [
    { id: "201270eb-b392-4e41-96a9-1b609a77e795", name: "Huan" },
    { id: "0390fea6-efb9-45ea-a1a3-71b170224e58", name: "Dragonfly 3 PRO" },
    { id: "2cf40f05-fa65-4a5c-936a-c67de7025af3", name: "H200A" },
  ];
  await page.goto(`/mouse/${dragonflyA9UltraId}`);
  await page.getByRole("link", { name: "Comparar com parecidos" }).click();

  const ids = [dragonflyA9UltraId, ...nearestToDragonflyA9Ultra.map((product) => product.id)];
  await expect(page).toHaveURL(`/comparar/mouse?p=${ids.join(",")}`);
  const removeButtons = page
    .getByRole("columnheader")
    .getByRole("button", { name: /^Remover .+ da comparação$/ });
  await expect
    .poll(() =>
      removeButtons.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute("aria-label")),
      ),
    )
    .toEqual(
      ["Dragonfly A9 Ultra", ...nearestToDragonflyA9Ultra.map((product) => product.name)].map(
        (name) => `Remover ${name} da comparação`,
      ),
    );
});

test.describe("with a meta.json from before the Cotação", () => {
  // The service worker would answer meta.json from its precache, out of the route's reach.
  test.use({ serviceWorkers: "block" });

  test("the app still loads and the Preço shows only the won, in the table and the detail", async ({
    page,
  }) => {
    await page.route("**/data/meta.json", async (route) => {
      const { krwBrl, ...metaBeforeCotacao } = await (await route.fetch()).json();
      expect(krwBrl).toBeDefined();
      await route.fulfill({ json: metaBeforeCotacao });
    });
    await page.goto(`/mouse/${dragonflyA9UltraId}?status=todos`);

    await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();
    await expect(page.getByRole("article")).toMatchAriaSnapshot(`
      - term: Preço
      - definition: ₩ 98.900
    `);
    await expect(page.getByRole("cell", { name: "₩ 98.900", exact: true })).toBeVisible();
    await expect(page.getByText("R$")).toHaveCount(0);
  });
});

test("an unknown Produto shows Produto não encontrado over its table, and closing leaves the table", async ({
  page,
}) => {
  await page.goto("/teclado/00000000-0000-4000-8000-000000000000?status=testados");
  await expect(page.getByRole("dialog", { name: "Produto não encontrado" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(page).toHaveURL("/teclado?status=testados");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");

  await page.goto(`/fones/${dragonflyA9UltraId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
});

test("regression: a value smaller than two decimals, such as 0,001 mm, is not shown as 0", async ({
  page,
}) => {
  await page.goto("/teclado/04ef23e4-e4bd-4212-be44-daabe2640afd");
  await expect(page.getByRole("dialog", { name: "TENKO - ARC 60" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Especificações" })).toMatchAriaSnapshot(`
    - term: Acionamento mínimo
    - definition: 0,001 mm
  `);
});

test.describe("in a time zone behind Korea", () => {
  test.use({ timezoneId: "America/Sao_Paulo" });

  test("regression: Data de publicação shows EyeJoker's day, not the viewer's", async ({
    page,
  }) => {
    // H200A was published at 2025-10-31T20:19Z: 1 November in Korea, 31 October in São Paulo.
    await page.goto("/mouse/2cf40f05-fa65-4a5c-936a-c67de7025af3");
    await expect(page.getByRole("region", { name: "Especificações" })).toMatchAriaSnapshot(`
      - term: Data de publicação
      - definition: 1 de nov. de 2025
    `);
  });
});

test("regression: a detail photo that fails to load leaves the photo space, not a broken image", async ({
  page,
}) => {
  await page.route("**/images/**", (route) => route.abort());
  await page.goto(`/mouse/${dragonflyA9UltraId}`);

  await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
});

test("regression: switching Categoria with the panel open closes it and names the page after the new Categoria", async ({
  page,
}) => {
  await page.goto(`/mouse/${dragonflyA9UltraId}`);
  await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Categorias" })
    .getByRole("link", { name: "Teclados" })
    .click();
  await expect(page).toHaveURL("/teclado");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Produto não encontrado")).toHaveCount(0);
  await expect(page).toHaveTitle("Teclados · Periscópio");
});

test("regression: closing the panel of a Produto id with a quote does not break the page", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/mouse/a%22b");
  await expect(page.getByRole("dialog", { name: "Produto não encontrado" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(page).toHaveURL("/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");
  expect(pageErrors).toEqual([]);
});

test("regression: Escape in the table's search box clears the search and leaves the panel open", async ({
  page,
}) => {
  await page.goto(`/mouse/${dragonflyA9UltraId}?q=dragon`);
  const searchBox = page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" });
  await searchBox.focus();
  await page.keyboard.press("Escape");

  await expect(searchBox).toHaveValue("");
  await expect(page).toHaveURL(`/mouse/${dragonflyA9UltraId}`);
  await expect(page.getByRole("dialog", { name: "Dragonfly A9 Ultra" })).toBeVisible();
});
