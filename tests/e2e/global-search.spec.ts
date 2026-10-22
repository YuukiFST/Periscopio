import { expect, test, type Page } from "@playwright/test";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded EyeJoker excerpt (`serve-fixture-build.ts`).
 */

const edge60HeProId = "021979aa-b222-47d3-b5ec-8b59d671aff4";
const huanId = "201270eb-b392-4e41-96a9-1b609a77e795";

function searchDialog(page: Page) {
  return page.getByRole("dialog", { name: "Buscar produtos" });
}

function searchBox(page: Page) {
  return searchDialog(page).getByRole("combobox", {
    name: "Buscar produto ou fabricante em todas as categorias",
  });
}

test("Ctrl+K opens the search from anywhere, Esc closes it and gives focus back", async ({
  page,
}) => {
  await page.goto("/mouse");
  const tableSearch = page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" });
  await tableSearch.click();

  await page.keyboard.press("Control+k");
  await expect(searchBox(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(searchDialog(page)).toHaveCount(0);
  await expect(tableSearch).toBeFocused();

  await page.keyboard.press("Meta+k");
  await expect(searchBox(page)).toBeFocused();
});

test("the header button opens the search, and Esc gives focus back to it", async ({ page }) => {
  await page.goto("/teclado");
  const searchButton = page.getByRole("banner").getByRole("button", { name: "Buscar" });
  await searchButton.click();
  await expect(searchBox(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(searchDialog(page)).toHaveCount(0);
  await expect(searchButton).toBeFocused();

  await searchButton.click();
  await searchDialog(page).getByRole("button", { name: "Fechar busca" }).click();
  await expect(searchDialog(page)).toHaveCount(0);
});

test("results come from every Categoria, grouped, and Enter opens the highlighted Produto", async ({
  page,
}) => {
  await page.goto("/monitor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Monitores");
  await page.keyboard.press("Control+k");
  // A manufacturer with a mouse and a teclado, typed in other case and with an accent.
  await searchBox(page).fill("átk");
  await expect(searchDialog(page).getByRole("listbox")).toMatchAriaSnapshot({
    name: "global-search-results.aria.yml",
  });

  const edgeOption = searchDialog(page).getByRole("option", { name: "EDGE 60HE Pro" });
  await expect(edgeOption).toHaveAttribute("id", /.+/);
  const edgeOptionId = await edgeOption.getAttribute("id");
  await page.keyboard.press("ArrowDown");
  await expect(searchBox(page)).toHaveAttribute("aria-activedescendant", edgeOptionId ?? "");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(`/teclado/${edge60HeProId}`);
  await expect(searchDialog(page)).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "EDGE 60HE Pro" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");
});

test("each Categoria shows its five best results, tested Produtos first, whatever their Status de teste", async ({
  page,
}) => {
  await page.goto("/mouse");
  await page.getByRole("banner").getByRole("button", { name: "Buscar" }).click();
  // Every one of the six fixture mouses has an "a" in its name or manufacturer.
  await searchBox(page).fill("a");
  // The sixth, Cloud XS, is the one still awaiting its test, though the data file lists it fourth.
  await expect(
    searchDialog(page).getByRole("group", { name: "Mouses" }).getByRole("option"),
  ).toHaveText([
    /^Dragonfly A9 Ultra /,
    /^Dragonfly 3 PRO /,
    /^Huan /,
    /^H200A /,
    /^VK M5 Max THOR /,
  ]);
  // A Produto still awaiting its test is found too.
  await searchBox(page).fill("cloud xs");
  await expect(searchDialog(page).getByRole("option")).toHaveCount(1);
  await expect(searchDialog(page).getByRole("option")).toHaveAccessibleName(/^Cloud XS WAIZOWL$/);

  await searchBox(page).fill("nada-assim");
  await expect(searchDialog(page).getByText("Nenhum produto encontrado.")).toBeVisible();
});

test("a Produto of the Categoria on screen opens over its table, which keeps its search params", async ({
  page,
}) => {
  const tableSearch = "?status=todos&q=dragon";
  await page.goto(`/mouse${tableSearch}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");
  await page.keyboard.press("Control+k");
  await searchBox(page).fill("huan");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(`/mouse/${huanId}${tableSearch}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }),
  ).toHaveValue("dragon");
});
