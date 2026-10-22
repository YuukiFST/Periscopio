import { expect, test, type Page } from "@playwright/test";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded EyeJoker excerpt (`serve-fixture-build.ts`).
 */

const edge60HeProId = "021979aa-b222-47d3-b5ec-8b59d671aff4";

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
  await page.keyboard.press("ArrowDown");
  await expect(searchBox(page)).toHaveAttribute(
    "aria-activedescendant",
    (await edgeOption.getAttribute("id")) ?? "",
  );
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(`/teclado/${edge60HeProId}`);
  await expect(searchDialog(page)).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "EDGE 60HE Pro" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");
});

test("each Categoria shows at most five results, whatever their Status de teste", async ({
  page,
}) => {
  await page.goto("/mouse");
  await page.getByRole("banner").getByRole("button", { name: "Buscar" }).click();
  // Every one of the six fixture mouses has an "a" in its name or manufacturer.
  await searchBox(page).fill("a");
  const mouseGroup = searchDialog(page).getByRole("group", { name: "Mouses" });
  await expect(mouseGroup.getByRole("option")).toHaveCount(5);
  // A Produto still awaiting its test is found too.
  await searchBox(page).fill("cloud xs");
  await expect(searchDialog(page).getByRole("option")).toHaveCount(1);
  await expect(searchDialog(page).getByRole("option")).toHaveAccessibleName(/^Cloud XS WAIZOWL$/);

  await searchBox(page).fill("nada-assim");
  await expect(searchDialog(page).getByText("Nenhum produto encontrado.")).toBeVisible();
});
