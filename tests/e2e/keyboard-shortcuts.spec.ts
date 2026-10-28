import { expect, test, type Page } from "@playwright/test";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded Fonte excerpt (`serve-fixture-build.ts`).
 */

function tableSearch(page: Page) {
  return page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" });
}

/** The Produto row at `position`, counted from 0 below the header row. */
function productRow(page: Page, position: number) {
  return page
    .getByRole("table")
    .getByRole("row")
    .nth(position + 1);
}

function detailsLink(page: Page, position: number) {
  return productRow(page, position).getByRole("link", { name: /^Detalhes de / });
}

function compareCheckbox(page: Page, position: number) {
  return productRow(page, position).getByRole("checkbox", { name: /^Comparar / });
}

function shortcutsDialog(page: Page) {
  return page.getByRole("dialog", { name: "Atalhos de teclado" });
}

async function productNameAt(page: Page, position: number): Promise<string> {
  const label = await detailsLink(page, position).getAttribute("aria-label");
  return (label ?? "").replace(/^Detalhes de /, "");
}

test("/ focuses the table search and ? lists every shortcut", async ({ page }) => {
  await page.goto("/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  await page.keyboard.press("/");
  await expect(tableSearch(page)).toBeFocused();
  await expect(tableSearch(page)).toHaveValue("");

  await page.getByRole("heading", { level: 1 }).focus();
  await page.keyboard.press("?");
  await expect(shortcutsDialog(page).getByRole("term")).toHaveText([
    "Buscar em todas as categorias",
    "Ir para a busca da tabela",
    "Limpar a busca da tabela",
    "Próximo produto da tabela",
    "Produto anterior da tabela",
    "Abrir os detalhes do produto",
    "Marcar ou desmarcar o produto para a comparação",
    "Mostrar os atalhos",
  ]);
  await expect(shortcutsDialog(page).getByRole("definition")).toHaveText([
    "Ctrl K",
    "/",
    "Esc",
    "j ou ↓",
    "k ou ↑",
    "Enter",
    "c",
    "?",
  ]);

  // The dialog is modal and hides the page, search box included: `/` leaves focus in it.
  await page.keyboard.press("/");
  await expect(page.locator("#busca-produto")).not.toBeFocused();
  await expect(shortcutsDialog(page).getByRole("button", { name: "Fechar atalhos" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(shortcutsDialog(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("Esc in the table search clears the text and the link's search", async ({ page }) => {
  await page.goto("/mouse?q=dragon");
  await expect(tableSearch(page)).toHaveValue("dragon");
  await tableSearch(page).focus();

  await page.keyboard.press("Escape");
  await expect(tableSearch(page)).toHaveValue("");
  await expect(page).toHaveURL("/mouse");
  await expect(tableSearch(page)).toBeFocused();

  // An Escape that cancels a pending accent leaves the search as it was.
  await tableSearch(page).fill("razer");
  await tableSearch(page).dispatchEvent("keydown", {
    key: "Escape",
    bubbles: true,
    isComposing: true,
  });
  await expect(tableSearch(page)).toHaveValue("razer");

  // A dispatched key runs no browser default, like Firefox, which keeps the text on Escape.
  await tableSearch(page).fill("huan");
  await expect(page).toHaveURL("/mouse?q=huan");
  await tableSearch(page).dispatchEvent("keydown", { key: "Escape", bubbles: true });
  await expect(tableSearch(page)).toHaveValue("");
  await expect(page).toHaveURL("/mouse");
});

test("j, k and the arrows walk the rows, keeping the focused row on screen", async ({ page }) => {
  // Short enough that the table scrolls to reach its last row.
  await page.setViewportSize({ width: 1280, height: 520 });
  await page.goto("/mouse?status=todos");
  await expect(detailsLink(page, 0)).toBeVisible();
  const lastPosition = (await page.getByRole("table").getByRole("row").count()) - 2;
  await expect(detailsLink(page, lastPosition)).not.toBeInViewport();

  await detailsLink(page, 0).focus();
  await page.keyboard.press("j");
  await expect(detailsLink(page, 1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(detailsLink(page, 2)).toBeFocused();
  await page.keyboard.press("k");
  await expect(detailsLink(page, 1)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(detailsLink(page, 0)).toBeFocused();
  // With Caps Lock on, the letters arrive in upper case.
  await page.keyboard.press("Shift+J");
  await expect(detailsLink(page, 1)).toBeFocused();
  await page.keyboard.press("Shift+K");
  await expect(detailsLink(page, 0)).toBeFocused();
  // The first row has none above it.
  await page.keyboard.press("k");
  await expect(detailsLink(page, 0)).toBeFocused();

  for (let position = 1; position <= lastPosition; position++) await page.keyboard.press("j");
  await expect(detailsLink(page, lastPosition)).toBeFocused();
  await expect(detailsLink(page, lastPosition)).toBeInViewport({ ratio: 1 });
  await page.keyboard.press("j");
  await expect(detailsLink(page, lastPosition)).toBeFocused();

  // Back up to the first row, which must come out from under the sticky header.
  for (let position = lastPosition; position > 0; position--) await page.keyboard.press("k");
  await expect(detailsLink(page, 0)).toBeFocused();
  const headerBox = await page.getByRole("columnheader", { name: "Produto" }).boundingBox();
  const rowBox = await productRow(page, 0).boundingBox();
  expect(rowBox?.y).toBeGreaterThanOrEqual((headerBox?.y ?? 0) + (headerBox?.height ?? 0) - 1);

  // From the Comparação mark, the step lands on the next row's mark.
  await compareCheckbox(page, 0).focus();
  await page.keyboard.press("j");
  await expect(compareCheckbox(page, 1)).toBeFocused();
});

test("Enter opens the focused Produto's panel, from its link or its Comparação mark", async ({
  page,
}) => {
  await page.goto("/mouse");
  const secondName = await productNameAt(page, 1);
  await detailsLink(page, 0).focus();
  await page.keyboard.press("j");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: secondName })).toBeVisible();

  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(page.getByRole("dialog", { name: secondName })).toHaveCount(0);
  const firstName = await productNameAt(page, 0);
  await compareCheckbox(page, 0).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: firstName })).toBeVisible();
  await expect(compareCheckbox(page, 0)).not.toBeChecked();
});

test("c toggles the focused Produto's Comparação mark and keeps the 4-Produto limit", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  const compareBar = page.getByRole("region", { name: "Comparação" });
  await detailsLink(page, 0).focus();
  await page.keyboard.press("c");
  await expect(compareCheckbox(page, 0)).toBeChecked();
  await expect(detailsLink(page, 0)).toBeFocused();
  await page.keyboard.press("c");
  await expect(compareCheckbox(page, 0)).not.toBeChecked();
  // Held down, the key repeats, and the mark flips once.
  await page.keyboard.down("c");
  await page.keyboard.down("c");
  await page.keyboard.up("c");
  await expect(compareCheckbox(page, 0)).toBeChecked();
  await page.keyboard.press("c");
  await expect(compareCheckbox(page, 0)).not.toBeChecked();

  for (let position = 0; position < 4; position++) {
    await page.keyboard.press("c");
    await page.keyboard.press("j");
  }
  await expect(compareBar.getByRole("link", { name: "Comparar (4/4)" })).toBeVisible();
  const markedUrl = page.url();

  await expect(detailsLink(page, 4)).toBeFocused();
  await page.keyboard.press("c");
  await expect(compareCheckbox(page, 4)).not.toBeChecked();
  await expect(page).toHaveURL(markedUrl);
  await expect(compareBar).toContainText(
    "4 produtos marcados, o limite da comparação. Desmarque um para trocar.",
  );
});

test("typing in the search, or a key with Ctrl, Meta or Alt, triggers no shortcut", async ({
  page,
}) => {
  await page.goto("/mouse");
  await tableSearch(page).focus();
  await page.keyboard.type("jk/c?");
  await expect(tableSearch(page)).toHaveValue("jk/c?");
  await expect(tableSearch(page)).toBeFocused();
  await expect(shortcutsDialog(page)).toHaveCount(0);

  await page.goto("/mouse");
  await detailsLink(page, 0).focus();
  for (const key of ["Alt+j", "Control+ArrowDown", "Meta+j", "Alt+c", "Alt+/"]) {
    await page.keyboard.press(key);
  }
  await expect(detailsLink(page, 0)).toBeFocused();
  await expect(compareCheckbox(page, 0)).not.toBeChecked();
  await expect(tableSearch(page)).not.toBeFocused();
});

test("over the Filtros drawer on a phone, ? and / leave it alone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mouse");
  await page.getByRole("button", { name: "Filtros" }).click();
  const filtersDrawer = page.getByRole("dialog", { name: "Filtros" });
  await expect(filtersDrawer).toBeVisible();
  await filtersDrawer.getByRole("heading", { name: "Filtros", exact: true }).click();

  await page.keyboard.press("?");
  await page.keyboard.press("/");
  await expect(shortcutsDialog(page)).toHaveCount(0);
  await expect(page.locator("#busca-produto")).not.toBeFocused();
  await expect(filtersDrawer).toBeVisible();
});

test("/ and ? typed with AltGr, as on an ABNT2 keyboard without the /? key, still work", async ({
  page,
}) => {
  await page.goto("/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  // Windows reports AltGr as Ctrl and Alt together, with the AltGraph modifier on.
  const altGraph = { bubbles: true, ctrlKey: true, altKey: true, modifierAltGraph: true };
  await page.getByRole("heading", { level: 1 }).dispatchEvent("keydown", { key: "?", ...altGraph });
  await expect(shortcutsDialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(shortcutsDialog(page)).toHaveCount(0);

  await page.getByRole("heading", { level: 1 }).dispatchEvent("keydown", { key: "/", ...altGraph });
  await expect(tableSearch(page)).toBeFocused();
});
