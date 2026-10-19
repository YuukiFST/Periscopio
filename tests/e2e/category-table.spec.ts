import { expect, test, type Page } from "@playwright/test";
import { metaSchema } from "../../src/data/schema.ts";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded EyeJoker excerpt (`serve-fixture-build.ts`):
 * 6 mouses, 4 teclados and 4 monitores.
 */

const mouseDataOrder = [
  "Dragonfly A9 Ultra",
  "Dragonfly 3 PRO",
  "VK M5 Max THOR",
  "Cloud XS",
  "Huan",
  "H200A",
];
/** Nota geral, best first; ties keep EyeJoker's order, Products without a grade last. */
const mouseDefaultOrder = [
  "Dragonfly A9 Ultra",
  "Huan",
  "Dragonfly 3 PRO",
  "H200A",
  "VK M5 Max THOR",
  "Cloud XS",
];

async function productNames(page: Page): Promise<string[]> {
  const rowHeaders = await page.getByRole("rowheader").allInnerTexts();
  return rowHeaders.map((text) => text.split("\n")[0] ?? "");
}

function searchBox(page: Page) {
  return page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" });
}

function sortButton(page: Page, columnName: string) {
  return page.getByRole("columnheader", { name: columnName }).getByRole("button");
}

/** One row per Categoria with every cell spelled out, as the pt formatting must render it. */
const categoryTables = [
  {
    slug: "mouse",
    heading: "Mouses",
    count: 6,
    rowHeader: "Dragonfly A9 Ultra ATK",
    cells: [
      "Tier 0",
      "Recomendado",
      "Dragonfly A9 Ultra no AliExpress",
      "₩ 98.900",
      "PAW3950 Ultra (42K)",
      "Nordic nRF52840",
      "Simétrico",
      "54 g",
      "0,70 ms desvio padrão 0,29",
      "0,49 ms desvio padrão 0,08",
    ],
  },
  {
    slug: "teclado",
    heading: "Teclados",
    count: 4,
    rowHeader: "TENKO - ARC 60 ARBITER STUDIO",
    cells: [
      "Impecável",
      "Recomendação fraca",
      "Sem dado",
      "₩ 195.000",
      "0,25 ms desvio padrão 0,05",
      "6.155 Hz",
      "Sem dado",
      "0,13 mm",
      "0,00 mm",
      "1,24%",
    ],
  },
  {
    slug: "monitor",
    heading: "Monitores",
    count: 4,
    rowHeader: "UltraGear 32GS95UE 4K Mode LGE",
    cells: [
      "Tier 0",
      "Não recomendado",
      "Sem dado",
      "Sem dado",
      '32"',
      "240 Hz",
      "UHD (3840×2160)",
      "DisplayHDR True Black 400",
      "3,53 ms",
      "96,5%",
      "277 cd/m²",
      "Sem dado",
      "Sem dado",
    ],
  },
];

for (const category of categoryTables) {
  test(`/${category.slug} lists every Product with EyeJoker's columns in pt, its default order and AliExpress links only where they exist`, async ({
    page,
  }) => {
    await page.goto(`/${category.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.heading);
    await expect(page.getByText(`${category.count} produtos`)).toBeVisible();
    await expect(page.getByRole("table")).toMatchAriaSnapshot({
      name: `${category.slug}-table.aria.yml`,
    });
    // The leading cell holds the row's mark for the Comparação.
    const exactRow = [
      "- cell",
      `- rowheader ${JSON.stringify(category.rowHeader)}`,
      ...category.cells.map((cell) => `- cell ${JSON.stringify(cell)}`),
    ].join("\n");
    await expect(
      page
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name: category.rowHeader, exact: true }) }),
    ).toMatchAriaSnapshot(exactRow);
  });
}

test("a header click sorts ascending, then descending, then not at all, with empty values last", async ({
  page,
}) => {
  await page.goto("/mouse");
  await expect(page.getByRole("columnheader", { name: "Nota geral" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await expect.poll(() => productNames(page)).toEqual(mouseDefaultOrder);

  const priceHeader = page.getByRole("columnheader", { name: "Preço" });
  await sortButton(page, "Preço").click();
  await expect(page).toHaveURL("/mouse?ordem=preco");
  await expect(priceHeader).toHaveAttribute("aria-sort", "ascending");
  await expect
    .poll(() => productNames(page))
    .toEqual([
      "Dragonfly 3 PRO",
      "H200A",
      "Dragonfly A9 Ultra",
      "Cloud XS",
      "Huan",
      "VK M5 Max THOR",
    ]);

  await sortButton(page, "Preço").click();
  await expect(page).toHaveURL("/mouse?ordem=-preco");
  await expect(priceHeader).toHaveAttribute("aria-sort", "descending");
  await expect
    .poll(() => productNames(page))
    .toEqual([
      "Huan",
      "Cloud XS",
      "Dragonfly A9 Ultra",
      "H200A",
      "Dragonfly 3 PRO",
      "VK M5 Max THOR",
    ]);

  await sortButton(page, "Preço").click();
  await expect(page).toHaveURL("/mouse?ordem=nenhuma");
  await expect(priceHeader).not.toHaveAttribute("aria-sort");
  await expect.poll(() => productNames(page)).toEqual(mouseDataOrder);
});

test("regression: a Produto priced ₩ 0 shows no Preço and sorts with the empty ones, not as the cheapest", async ({
  page,
}) => {
  await page.goto("/monitor?ordem=preco");
  await expect
    .poll(() => productNames(page))
    .toEqual([
      "모비우스 EX2510S",
      "ROG SWIFT PG259QN",
      "XG259QDNS Ace",
      "UltraGear 32GS95UE 4K Mode",
    ]);
  await expect(page.getByRole("cell", { name: "₩ 0" })).toHaveCount(0);
});

test("the search finds Products by name or manufacturer and the Status de teste narrows the list", async ({
  page,
}) => {
  await page.goto("/mouse");

  await searchBox(page).fill("wlmouse");
  await expect(page).toHaveURL("/mouse?q=wlmouse");
  await expect(page.getByText("1 de 6 produtos")).toBeVisible();
  await expect.poll(() => productNames(page)).toEqual(["Huan"]);

  await searchBox(page).fill("dragonfly");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly A9 Ultra", "Dragonfly 3 PRO"]);

  await searchBox(page).fill("");
  await page.getByRole("radio", { name: "Testados", exact: true }).check();
  await expect(page).toHaveURL("/mouse?status=testados");
  await expect
    .poll(() => productNames(page))
    .toEqual(["Dragonfly A9 Ultra", "Huan", "Dragonfly 3 PRO", "H200A"]);

  await page.getByRole("radio", { name: "Não testados" }).check();
  await expect(page).toHaveURL("/mouse?status=nao-testados");
  await expect.poll(() => productNames(page)).toEqual(["VK M5 Max THOR", "Cloud XS"]);

  await searchBox(page).fill("huan");
  await expect(page.getByText("Nenhum produto não testado encontrado para “huan”.")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar todos os produtos" }).click();
  await expect(page).toHaveURL("/mouse");
  await expect(searchBox(page)).toHaveValue("");
  await expect(searchBox(page)).toBeFocused();
  await expect.poll(() => productNames(page)).toEqual(mouseDefaultOrder);
});

test("regression: the search box follows the link when the header's Categoria link drops the search", async ({
  page,
}) => {
  await page.goto("/mouse?q=wlmouse");
  await expect(searchBox(page)).toHaveValue("wlmouse");
  await expect.poll(() => productNames(page)).toEqual(["Huan"]);

  await page
    .getByRole("navigation", { name: "Categorias" })
    .getByRole("link", { name: "Mouses" })
    .click();
  await expect(page).toHaveURL("/mouse");
  await expect(searchBox(page)).toHaveValue("");
  await expect.poll(() => productNames(page)).toEqual(mouseDefaultOrder);

  // The link drops a `q` over 100 characters, so the box stops at 100 and the link keeps them.
  await searchBox(page).fill("a".repeat(101));
  await expect(searchBox(page)).toHaveValue("a".repeat(100));
  await expect(page).toHaveURL(`/mouse?q=${"a".repeat(100)}`);
});

test("a copied link opens the same sort, search and Status de teste in a new tab", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/mouse");
  await sortButton(page, "Peso").click();
  await sortButton(page, "Peso").click();
  await page.getByRole("radio", { name: "Testados", exact: true }).check();
  await searchBox(page).fill("dragon");
  const expectedNames = ["Dragonfly 3 PRO", "Dragonfly A9 Ultra"];
  await expect.poll(() => productNames(page)).toEqual(expectedNames);

  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByRole("button", { name: "Link copiado" })).toBeVisible();
  const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(Object.fromEntries(new URL(copiedLink).searchParams)).toEqual({
    ordem: "-peso",
    status: "testados",
    q: "dragon",
  });

  const newTab = await context.newPage();
  await newTab.goto(copiedLink);
  await expect.poll(() => productNames(newTab)).toEqual(expectedNames);
  await expect(searchBox(newTab)).toHaveValue("dragon");
  await expect(newTab.getByRole("radio", { name: "Testados", exact: true })).toBeChecked();
  await expect(newTab.getByRole("columnheader", { name: "Peso" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("a link with invalid values opens the default view without an error", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const search of [
    "?ordem=-aliexpress,desconhecida&status=talvez",
    `?ordem=%7B%22peso%22%3A1%7D&status=1&q=${"a".repeat(101)}`,
  ]) {
    await page.goto(`/mouse${search}`);
    await expect.poll(() => productNames(page)).toEqual(mouseDefaultOrder);
    await expect(page.getByRole("radio", { name: "Todos" })).toBeChecked();
    await expect(searchBox(page)).toHaveValue("");
    await expect(page.getByRole("columnheader", { name: "Nota geral" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  }
  expect(pageErrors).toEqual([]);
});

test("on a phone the table scrolls sideways with the Product column fixed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mouse");
  const firstProduct = page.getByRole("rowheader").first();
  const lastHeader = page.getByRole("columnheader", { name: "Resposta do clique" });
  await expect(lastHeader).not.toBeInViewport();

  await page
    .getByRole("table")
    .locator("xpath=..")
    .evaluate((scroller) => scroller.scrollTo({ left: scroller.scrollWidth }));
  await expect(lastHeader).toBeInViewport();
  await expect(firstProduct).toBeInViewport();
  await expect(firstProduct).toContainText("Dragonfly A9 Ultra");
});

test("the Atualização date shows, and a warning appears once the data is more than 8 days old", async ({
  page,
  request,
}) => {
  const meta = metaSchema.parse(await (await request.get("/data/meta.json")).json());
  await page.goto("/mouse");
  await expect(page.getByText(/^Atualizado em \d{1,2} de \p{L}+ de \d{4}$/u)).toBeVisible();
  await expect(page.getByText("Dados desatualizados")).toHaveCount(0);

  const nineDaysMs = 9 * 24 * 60 * 60 * 1000;
  await page.clock.setFixedTime(Date.parse(meta.updatedAt) + nineDaysMs);
  await page.reload();
  await expect(page.locator("p", { hasText: /^Dados desatualizados:/ })).toHaveText(
    /^Dados desatualizados: a última atualização foi em .+, há 9 dias\. Os preços/,
  );
  await expect(page.getByText(/^Atualizado em/)).toHaveCount(0);
});
