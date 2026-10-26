import { expect, test, type Page } from "@playwright/test";

/**
 * The "Colunas" menu over the fixture build (`serve-fixture-build.ts`): 6
 * mouses, 4 teclados and 4 monitores.
 */

const mouseDefaultHeaders = [
  "Comparar",
  "Produto",
  "Resposta do sensor",
  "Resposta do clique",
  "Nota geral",
  "Recomendação",
  "Preço",
  "Sensor",
  "MCU",
  "Formato",
  "Peso",
];
const mouseDefaultColumnsParam =
  "sensorAvg,optimalResponseSpeed,overallRatingMouse,eyejokerRating,preco,sensor,mouseMcu,housingMouse,weight";

async function columnHeaders(page: Page): Promise<string[]> {
  return page.getByRole("columnheader").allInnerTexts();
}

async function productNames(page: Page): Promise<string[]> {
  const rowHeaders = await page.getByRole("rowheader").allInnerTexts();
  return rowHeaders.map((text) => text.split("\n")[0] ?? "");
}

function columnsMenu(page: Page) {
  return page.getByRole("dialog", { name: "Colunas" });
}

async function openColumnsMenu(page: Page) {
  await page.getByRole("button", { name: "Colunas" }).click();
  await expect(columnsMenu(page)).toBeVisible();
}

test("the Colunas menu lists the Categoria's fields grouped like the detail, and its search narrows them", async ({
  page,
}) => {
  await page.goto("/mouse");
  await openColumnsMenu(page);
  await expect(columnsMenu(page)).toMatchAriaSnapshot({ name: "mouse-columns-menu.aria.yml" });

  const search = columnsMenu(page).getByRole("searchbox", { name: "Buscar coluna" });
  await search.fill("largura");
  await expect(columnsMenu(page).getByRole("checkbox")).toHaveCount(1);
  await expect(
    columnsMenu(page)
      .getByRole("group", { name: "Especificações" })
      .getByRole("checkbox", { name: "Largura máxima" }),
  ).not.toBeChecked();

  await search.fill("sem coluna assim");
  await expect(columnsMenu(page).getByRole("checkbox")).toHaveCount(0);
  await expect(columnsMenu(page)).toContainText(
    "Nenhuma coluna encontrada para “sem coluna assim”.",
  );
});

test("a checked field joins the table as its last column and sorts by its field key; an unchecked one leaves", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  await expect.poll(() => columnHeaders(page)).toEqual(mouseDefaultHeaders);

  await openColumnsMenu(page);
  await columnsMenu(page).getByRole("checkbox", { name: "Largura máxima" }).check();
  await expect(page).toHaveURL(`/mouse?status=todos&col=${mouseDefaultColumnsParam},maxWidth`);
  await expect.poll(() => columnHeaders(page)).toEqual([...mouseDefaultHeaders, "Largura máxima"]);
  await expect(
    page
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: "Huan WLMouse", exact: true }) })
      .getByRole("cell")
      .last(),
  ).toHaveText("61 mm");

  await page.keyboard.press("Escape");
  await page.getByRole("columnheader", { name: "Largura máxima" }).getByRole("button").click();
  await expect(page).toHaveURL(
    `/mouse?status=todos&col=${mouseDefaultColumnsParam},maxWidth&ordem=maxWidth`,
  );
  await expect(page.getByRole("columnheader", { name: "Largura máxima" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  await expect
    .poll(() => productNames(page))
    .toEqual([
      "Huan",
      "Cloud XS",
      "Dragonfly 3 PRO",
      "Dragonfly A9 Ultra",
      "VK M5 Max THOR",
      "H200A",
    ]);

  await openColumnsMenu(page);
  await columnsMenu(page).getByRole("checkbox", { name: "Peso", exact: true }).uncheck();
  await expect(page).toHaveURL(
    `/mouse?status=todos&col=${mouseDefaultColumnsParam.replace(",weight", "")},maxWidth&ordem=maxWidth`,
  );
  await expect
    .poll(() => columnHeaders(page))
    .toEqual([...mouseDefaultHeaders.filter((header) => header !== "Peso"), "Largura máxima"]);
});

test("the chosen columns open from the link anywhere, stay the device's default per Categoria, and Restaurar padrão brings back the default", async ({
  page,
  browser,
}) => {
  await page.goto("/mouse?status=todos");
  await openColumnsMenu(page);
  await columnsMenu(page).getByRole("checkbox", { name: "Largura máxima" }).check();
  await expect(page).toHaveURL(/col=/);
  const chosenHeaders = [...mouseDefaultHeaders, "Largura máxima"];

  // A friend's browser has nothing stored: the link alone carries the choice.
  const friendContext = await browser.newContext();
  const friendPage = await friendContext.newPage();
  await friendPage.goto(page.url());
  await expect.poll(() => columnHeaders(friendPage)).toEqual(chosenHeaders);
  await friendContext.close();

  await page.goto("/mouse?status=todos");
  await expect.poll(() => columnHeaders(page)).toEqual(chosenHeaders);
  await page.goto("/teclado?status=todos");
  await expect(page.getByRole("columnheader", { name: "Nota geral" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Largura máxima" })).toHaveCount(0);

  await page.goto("/mouse?status=todos");
  await openColumnsMenu(page);
  const reset = columnsMenu(page).getByRole("button", { name: "Restaurar padrão" });
  await reset.click();
  await expect(page).toHaveURL("/mouse?status=todos");
  await expect.poll(() => columnHeaders(page)).toEqual(mouseDefaultHeaders);
  await expect(reset).toBeDisabled();

  await page.reload();
  await expect.poll(() => columnHeaders(page)).toEqual(mouseDefaultHeaders);
});

test("a link drops the col keys it does not know and still opens, and the Produto column always shows", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos&col=maxWidth,naoExiste,status,weight");
  await expect
    .poll(() => columnHeaders(page))
    .toEqual(["Comparar", "Produto", "Largura máxima", "Peso"]);

  await page.goto("/mouse?status=todos&col=naoExiste");
  await expect.poll(() => columnHeaders(page)).toEqual(mouseDefaultHeaders);

  await page.goto("/mouse?status=todos&col=produto");
  await expect.poll(() => columnHeaders(page)).toEqual(["Comparar", "Produto"]);
  await expect(page.getByRole("rowheader")).toHaveCount(6);
});

test("a default column no Produto has a value for yet stays listed, survives another choice and can be removed", async ({
  page,
}) => {
  // No monitor in the fixture has the Reflexão total (SCI) measured.
  await page.goto("/monitor?status=todos");
  await expect(page.getByRole("columnheader", { name: "Reflexão total (SCI)" })).toBeVisible();
  const defaultHeaders = await columnHeaders(page);

  await openColumnsMenu(page);
  const reflectance = columnsMenu(page).getByRole("checkbox", { name: "Reflexão total (SCI)" });
  await expect(reflectance).toBeChecked();
  const panel = columnsMenu(page).getByRole("checkbox", { name: "Painel", exact: true });
  await panel.check();
  await expect.poll(() => columnHeaders(page)).toEqual([...defaultHeaders, "Painel"]);
  await panel.uncheck();
  await expect(page).toHaveURL("/monitor?status=todos");
  await expect(columnsMenu(page).getByRole("button", { name: "Restaurar padrão" })).toBeDisabled();

  await reflectance.uncheck();
  await expect
    .poll(() => columnHeaders(page))
    .toEqual(defaultHeaders.filter((header) => header !== "Reflexão total (SCI)"));
});
