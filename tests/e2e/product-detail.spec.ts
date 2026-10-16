import { expect, test } from "@playwright/test";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded EyeJoker excerpt (`serve-fixture-build.ts`).
 */

const dragonflyA9UltraId = "003586ba-0cbf-4932-843c-24e5f56e47c2";
/** A mouse EyeJoker lists without Medições, photo, Preço or AliExpress link. */
const vkM5MaxThorId = "0fbec015-8d94-469d-993e-1d9d5138fb9b";

test("a Produto opened from the table shows its header and fields grouped in pt, and the way back reopens the table as it was", async ({
  page,
}) => {
  // `outro` stands for any param the table reads: the detail screen keeps them all, not a list.
  const tableSearch = "?ordem=-peso&status=testados&q=dragon&outro=1";
  await page.goto(`/mouse${tableSearch}`);
  await page.getByRole("link", { name: "Dragonfly A9 Ultra", exact: true }).click();

  await expect(page).toHaveURL(`/mouse/${dragonflyA9UltraId}${tableSearch}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dragonfly A9 Ultra");
  await expect(page).toHaveTitle("Dragonfly A9 Ultra · EyeJoker");
  await expect(page.getByRole("link", { name: "Ver no AliExpress" })).toHaveAttribute(
    "href",
    "https://s.click.aliexpress.com/e/_oFLhAg6",
  );
  await expect(page.getByRole("article")).toMatchAriaSnapshot({ name: "mouse-detail.aria.yml" });
  await expect(page.getByRole("region", { name: "Especificações" })).toMatchAriaSnapshot(`
    - term: Nota geral
    - definition: Tier 0
    - term: Formato
    - definition: Simétrico
    - term: Peso
    - definition: 54 g
  `);
  await expect(page.getByRole("region", { name: "Medições" })).toMatchAriaSnapshot(`
    - term: Resposta média do sensor
    - definition: 0,70 ms
    - term: Resposta do clique
    - definition: 0,49 ms
  `);

  await page.getByRole("link", { name: "Voltar para Mouses" }).click();
  await expect(page).toHaveURL(`/mouse${tableSearch}`);
  await expect(
    page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }),
  ).toHaveValue("dragon");
  await expect(page.getByRole("radio", { name: "Testados", exact: true })).toBeChecked();
  await expect(page.getByRole("columnheader", { name: "Peso" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("a Produto without Medições shows no Medições group, and says what is missing", async ({
  page,
}) => {
  await page.goto(`/mouse/${vkM5MaxThorId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("VK M5 Max THOR");
  await expect(page.getByRole("region", { name: "Especificações" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Medições" })).toHaveCount(0);
  await expect(
    page.getByText("O EyeJoker ainda não publicou medições deste produto."),
  ).toBeVisible();
  await expect(page.getByRole("article")).toMatchAriaSnapshot(`
    - heading "VK M5 Max THOR" [level=1]
    - paragraph: VALKYRIE
    - term: Preço
    - definition: Sem preço
    - term: Status de teste
    - definition: Sugerido
  `);
  await expect(page.getByRole("link", { name: "Ver no AliExpress" })).toHaveCount(0);
});

test("an unknown Produto shows Produto não encontrado with the way back to its table", async ({
  page,
}) => {
  await page.goto("/teclado/00000000-0000-4000-8000-000000000000?status=testados");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Produto não encontrado");
  await page.getByRole("link", { name: "Voltar para Teclados" }).click();
  await expect(page).toHaveURL("/teclado?status=testados");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");

  await page.goto(`/fones/${dragonflyA9UltraId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
});

