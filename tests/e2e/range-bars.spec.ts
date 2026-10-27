import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The bar behind a number, over the fixture build (`serve-fixture-build.ts`).
 * The 6 mouses weigh from 45 g (Cloud XS) to 102 g (H200A), and a lighter
 * mouse is better, so 48 g (Huan) sits at (102 - 48) / (102 - 45) of the way.
 */

const weightPlaces = {
  "Cloud XS": 1,
  Huan: (102 - 48) / 57,
  "Dragonfly 3 PRO": (102 - 58) / 57,
  H200A: 0,
};
const huanId = "201270eb-b392-4e41-96a9-1b609a77e795";
const dragonfly3ProId = "0390fea6-efb9-45ea-a1a3-71b170224e58";

/** The cell of `productName`'s row under the column `header` of the Categoria table. */
async function tableCell(page: Page, productName: string, header: string): Promise<Locator> {
  await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
  const headers = await page.getByRole("columnheader").allInnerTexts();
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: productName }) });
  return row.getByRole("cell").nth(headers.indexOf(header) - 1);
}

function rangeBar(cell: Locator): Locator {
  return cell.locator('[aria-hidden="true"]:empty');
}

/** How much of the cell's width the bar fills, from 0 to 1. */
async function barShare(cell: Locator): Promise<number> {
  return rangeBar(cell).evaluate((bar) => {
    const track = bar.parentElement?.getBoundingClientRect().width ?? Number.NaN;
    return bar.getBoundingClientRect().width / track;
  });
}

test("each Peso bar shows the weight's place among all the Categoria's mouses", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  for (const [name, place] of Object.entries(weightPlaces)) {
    expect(await barShare(await tableCell(page, name, "Peso"))).toBeCloseTo(place, 2);
  }

  // A Filtro leaves only the two lightest, but each keeps its place in the Categoria.
  await page.goto("/mouse?status=todos&peso=-50");
  await expect(page.getByRole("rowheader")).toHaveCount(2);
  expect(await barShare(await tableCell(page, "Cloud XS", "Peso"))).toBeCloseTo(1, 2);
  expect(await barShare(await tableCell(page, "Huan", "Peso"))).toBeCloseTo(weightPlaces.Huan, 2);
});

test("a number column with no better side shows no bar", async ({ page }) => {
  await page.goto("/mouse?status=todos&col=length,weight");
  const length = await tableCell(page, "Huan", "Comprimento");
  await expect(length).not.toHaveText("");
  await expect(rangeBar(length)).toHaveCount(0);
  await expect(rangeBar(await tableCell(page, "Huan", "Peso"))).toHaveCount(1);
});

test("the bars hide under forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/mouse?status=todos");
  const bar = rangeBar(await tableCell(page, "Huan", "Peso"));
  await expect(bar).toHaveCount(1);
  await expect(bar).toBeHidden();
});

test("the Comparação's Peso row places each mouse on the Categoria's scale", async ({ page }) => {
  await page.goto(`/comparar/mouse?p=${huanId},${dragonfly3ProId}`);
  const cells = page
    .getByRole("table", { name: /^Comparação de / })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: "Peso", exact: true }) })
    .getByRole("cell");
  // Two mouses compared, yet neither is at the ends: the scale is the Categoria's.
  expect(await barShare(cells.nth(0))).toBeCloseTo(weightPlaces.Huan, 2);
  expect(await barShare(cells.nth(1))).toBeCloseTo(weightPlaces["Dragonfly 3 PRO"], 2);
});
