import { expect, test, type Page } from "@playwright/test";
import { categoryDataSchema } from "../../src/data/schema.ts";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded EyeJoker excerpt (`serve-fixture-build.ts`).
 */

const mouses = {
  dragonflyA9Ultra: { id: "003586ba-0cbf-4932-843c-24e5f56e47c2", name: "Dragonfly A9 Ultra" },
  dragonfly3Pro: { id: "0390fea6-efb9-45ea-a1a3-71b170224e58", name: "Dragonfly 3 PRO" },
  vkM5MaxThor: { id: "0fbec015-8d94-469d-993e-1d9d5138fb9b", name: "VK M5 Max THOR" },
  cloudXs: { id: "1f2e9ba6-5ac5-4f0d-b986-7cb4203b5d6c", name: "Cloud XS" },
  huan: { id: "201270eb-b392-4e41-96a9-1b609a77e795", name: "Huan" },
  h200a: { id: "2cf40f05-fa65-4a5c-936a-c67de7025af3", name: "H200A" },
};
const ultraGearId = "168e2700-995b-4632-86e9-08613515a315";
const pg259qnId = "7aa60f74-aa55-44f0-9858-9d672a19fba5";
const highlightLabel = "melhor nesta medida";
const tieLabel = "empate nesta medida";

function compareCheckbox(page: Page, productName: string) {
  return page.getByRole("checkbox", { name: `Comparar ${productName}`, exact: true });
}

function compareBar(page: Page) {
  return page.getByRole("region", { name: "Comparação" });
}

/** The compared Produtos, in column order, by the names their remove buttons carry. */
async function comparedProductNames(page: Page): Promise<string[]> {
  const labels = await page
    .getByRole("columnheader")
    .getByRole("button", { name: /^Remover .+ da comparação$/ })
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label") ?? ""));
  return labels.map((label) => label.replace(/^Remover /, "").replace(/ da comparação$/, ""));
}

/** The names, in column order, of the Produtos whose cell in the row of `fieldLabel` carries `markLabel`. */
async function markedProducts(
  page: Page,
  fieldLabel: string,
  markLabel: string,
): Promise<string[]> {
  const names = await comparedProductNames(page);
  const cells = page
    .getByRole("table", { name: /^Comparação de / })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: fieldLabel, exact: true }) })
    .getByRole("cell");
  await expect(cells).toHaveCount(names.length);
  const marked: string[] = [];
  for (const [position, name] of names.entries()) {
    const marks = await cells.nth(position).getByRole("img", { name: markLabel }).count();
    if (marks > 0) marked.push(name);
  }
  return marked;
}

/** The Produtos with the Destaque in the row of `fieldLabel`. */
function highlightedProducts(page: Page, fieldLabel: string): Promise<string[]> {
  return markedProducts(page, fieldLabel, highlightLabel);
}

test("three mouses marked on the table open side by side, with the Destaque where better is clear and no Preço", async ({
  context,
  page,
}) => {
  await page.goto("/mouse");
  for (const mouse of [mouses.dragonflyA9Ultra, mouses.huan, mouses.h200a]) {
    await compareCheckbox(page, mouse.name).check();
  }
  const comparedIds = [mouses.dragonflyA9Ultra.id, mouses.huan.id, mouses.h200a.id].join(",");
  await expect(page).toHaveURL(`/mouse?cmp=${comparedIds}`);
  await expect(compareBar(page)).toContainText("3 produtos marcados.");
  await compareBar(page).getByRole("link", { name: "Comparar (3/4)" }).click();

  await expect(page).toHaveURL(`/comparar/mouse?p=${comparedIds}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comparação de mouses");
  await expect(page).toHaveTitle("Comparação de mouses · Periscópio");
  await expect(page.getByRole("article")).toMatchAriaSnapshot({
    name: "mouse-comparison.aria.yml",
  });

  const expectedHighlights: [fieldLabel: string, products: string[]][] = [
    // Lower is better, on the shown 48 g against 54 g and 102 g.
    ["Peso", ["Huan"]],
    ["Resposta do clique", ["Dragonfly A9 Ultra"]],
    // A tie at the best value highlights both.
    ["Velocidade máxima de rastreio", ["Dragonfly A9 Ultra", "Huan"]],
    // Huan has no Debounce and stays out; 19 ms beats 22 ms.
    ["Debounce", ["Dragonfly A9 Ultra"]],
    // Grades in EyeJoker's order: A+ beats C and Sem nota.
    ["Nota geral", ["Dragonfly A9 Ultra"]],
    // All three at 8000 Hz: nobody is better, so the row shows the Empate instead.
    ["Polling rate máximo", []],
    // 600 mAh beats 500 and 300 mAh.
    ["Bateria", ["H200A"]],
    // A size has no better direction.
    ["Altura", []],
  ];
  for (const [fieldLabel, products] of expectedHighlights) {
    expect(await highlightedProducts(page, fieldLabel), fieldLabel).toEqual(products);
  }
  expect(await markedProducts(page, "Polling rate máximo", tieLabel)).toEqual([
    "Dragonfly A9 Ultra",
    "Huan",
    "H200A",
  ]);
  // A clear winner is a Destaque, never an Empate.
  expect(await markedProducts(page, "Peso", tieLabel)).toEqual([]);
  await expect(page.getByRole("rowheader", { name: "Preço" })).toHaveCount(0);
  await expect(
    page.getByText(
      "O Preço fica de fora da comparação porque preços mudam, e o EyeJoker não registra o preço da sua região.",
    ),
  ).toBeVisible();

  const friendPage = await context.newPage();
  await friendPage.goto(page.url());
  await expect(friendPage.getByRole("heading", { level: 1 })).toHaveText("Comparação de mouses");
  await expect(friendPage.getByRole("article")).toMatchAriaSnapshot({
    name: "mouse-comparison.aria.yml",
  });
  expect(await highlightedProducts(friendPage, "Peso")).toEqual(["Huan"]);
});

test("the Resumo de desempenho ranks the mouses by their fastest click and sensor, whatever the connection", async ({
  page,
}) => {
  await page.goto(
    `/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.huan.id},${mouses.h200a.id}`,
  );
  // H200A's sensor is fastest on its cable, 1,87 ms against 3,74 ms without it.
  await expect(page.getByRole("region", { name: "Resumo de desempenho" })).toMatchAriaSnapshot(`
    - region "Resumo de desempenho":
      - heading "Resumo de desempenho" [level=2]
      - paragraph: "Melhor desempenho: Dragonfly A9 Ultra."
      - paragraph
      - table "Resumo de desempenho":
        - rowgroup:
          - row "Mouse Pontuação Clique Sensor"
        - rowgroup:
          - row "1º Dragonfly A9 Ultra 100 melhor nesta medida 0,49 ms melhor nesta medida 0,70 ms melhor nesta medida"
          - row "2º Huan 54 5,34 ms 0,71 ms"
          - row "3º H200A 21 8,91 ms 1,87 ms com fio"
  `);
});

test("a mouse's Medições por conexão start folded and unfold on request", async ({ page }) => {
  await page.goto(`/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.h200a.id}`);
  const perConnectionRow = page.getByRole("rowheader", {
    name: "Resposta média do sensor (com fio)",
    exact: true,
  });
  const unfold = page.getByRole("button", { name: /^Mostrar \(\d+\)$/ });
  await expect(unfold).toHaveAttribute("aria-expanded", "false");
  await expect(perConnectionRow).toHaveCount(0);
  // The overall Medições stay in view.
  await expect(
    page.getByRole("rowheader", { name: "Resposta do clique", exact: true }),
  ).toBeVisible();

  await unfold.click();
  await expect(page.getByRole("button", { name: "Ocultar" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(perConnectionRow).toBeVisible();
});

test("a fifth mark is refused, with the reason in the bar", async ({ page }) => {
  await page.goto("/mouse");
  const marked = [mouses.dragonflyA9Ultra, mouses.huan, mouses.h200a, mouses.dragonfly3Pro];
  for (const mouse of marked) await compareCheckbox(page, mouse.name).check();
  const fourIds = `/mouse?cmp=${marked.map((mouse) => mouse.id).join(",")}`;
  await expect(page).toHaveURL(fourIds);

  const fifth = compareCheckbox(page, mouses.cloudXs.name);
  await expect(fifth).toBeDisabled();
  await expect(fifth).toHaveAccessibleDescription(
    "4 produtos marcados, o limite da comparação. Desmarque um para trocar.",
  );
  // A click reaches the box anyway, as a tap would; it stays unmarked and the link keeps four.
  await fifth.dispatchEvent("click");
  await expect(fifth).not.toBeChecked();
  await expect(page).toHaveURL(fourIds);
  await expect(compareBar(page).getByRole("link", { name: "Comparar (4/4)" })).toBeVisible();

  await compareCheckbox(page, mouses.h200a.name).uncheck();
  await expect(fifth).toBeEnabled();
  await fifth.check();
  await expect(compareBar(page).getByRole("link", { name: "Comparar (4/4)" })).toBeVisible();
});

test("a monitor's screen size gets no Destaque, while its refresh rate does", async ({ page }) => {
  await page.goto(`/comparar/monitor?p=${ultraGearId},${pg259qnId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comparação de monitores");
  await expect(page.getByRole("row", { name: /^Tamanho da tela/ })).toContainText('32"');
  expect(await highlightedProducts(page, "Tamanho da tela")).toEqual([]);
  expect(await highlightedProducts(page, "Taxa de atualização")).toEqual(["ROG SWIFT PG259QN"]);
});

test("an id the data no longer has is left out with a notice, and removing a Produto updates the link", async ({
  page,
}) => {
  const goneId = "00000000-0000-4000-8000-000000000000";
  await page.goto(
    `/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${goneId},${mouses.huan.id},${mouses.h200a.id}`,
  );
  await expect(
    page.getByText("1 produto do link não existe nos dados atuais do EyeJoker e ficou de fora."),
  ).toBeVisible();
  await expect
    .poll(() => comparedProductNames(page))
    .toEqual([mouses.dragonflyA9Ultra.name, mouses.huan.name, mouses.h200a.name]);

  await page.getByRole("button", { name: "Remover Huan da comparação" }).click();
  await expect(page).toHaveURL(
    `/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.h200a.id}`,
  );
  await expect
    .poll(() => comparedProductNames(page))
    .toEqual([mouses.dragonflyA9Ultra.name, mouses.h200a.name]);
  await expect(page.getByText("1 produto do link não existe")).toHaveCount(0);

  await page.getByRole("button", { name: "Remover H200A da comparação" }).click();
  await expect(
    page.getByText("Só 1 produto na comparação. Ela precisa de pelo menos 2."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar para Mouses" }).click();
  await expect(page).toHaveURL(`/mouse?cmp=${mouses.dragonflyA9Ultra.id}`);
  await expect(compareCheckbox(page, mouses.dragonflyA9Ultra.name)).toBeChecked();
});

test("the detail screen adds its Produto to the Comparação, and the table keeps the marks", async ({
  page,
}) => {
  await page.goto("/mouse?ordem=-peso");
  await compareCheckbox(page, mouses.dragonflyA9Ultra.name).check();
  await page.getByRole("link", { name: `Detalhes de ${mouses.huan.name}` }).click();
  await expect(page).toHaveURL(
    `/mouse/${mouses.huan.id}?ordem=-peso&cmp=${mouses.dragonflyA9Ultra.id}`,
  );

  await page.getByRole("button", { name: "Adicionar à comparação" }).click();
  const bothIds = `${mouses.dragonflyA9Ultra.id},${mouses.huan.id}`;
  await expect(page).toHaveURL(`/mouse/${mouses.huan.id}?ordem=-peso&cmp=${bothIds}`);
  await expect(page.getByRole("button", { name: "Remover da comparação" })).toBeVisible();
  await expect(compareBar(page).getByRole("link", { name: "Comparar (2/4)" })).toBeVisible();

  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(page).toHaveURL(`/mouse?ordem=-peso&cmp=${bothIds}`);
  await expect(compareCheckbox(page, mouses.huan.name)).toBeChecked();
  await compareBar(page).getByRole("link", { name: "Comparar (2/4)" }).click();
  await expect(page).toHaveURL(`/comparar/mouse?p=${bothIds}`);
  await expect
    .poll(() => comparedProductNames(page))
    .toEqual([mouses.dragonflyA9Ultra.name, mouses.huan.name]);
});

test("regression: the browser's back after adding from the detail screen keeps both marks", async ({
  page,
}) => {
  await page.goto("/mouse");
  await compareCheckbox(page, mouses.dragonflyA9Ultra.name).check();
  await expect(page).toHaveURL(`/mouse?cmp=${mouses.dragonflyA9Ultra.id}`);
  await page.getByRole("link", { name: `Detalhes de ${mouses.huan.name}` }).click();
  await page.getByRole("button", { name: "Adicionar à comparação" }).click();
  const bothIds = `${mouses.dragonflyA9Ultra.id},${mouses.huan.id}`;
  await expect(page).toHaveURL(`/mouse/${mouses.huan.id}?cmp=${bothIds}`);
  await expect(page.getByRole("button", { name: "Remover da comparação" })).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(`/mouse?cmp=${bothIds}`);
  await expect(compareCheckbox(page, mouses.dragonflyA9Ultra.name)).toBeChecked();
  await expect(compareCheckbox(page, mouses.huan.name)).toBeChecked();
  await expect(compareBar(page).getByRole("link", { name: "Comparar (2/4)" })).toBeVisible();
});

test("regression: the browser's back after a mark from the table's checkbox with the panel open keeps both marks", async ({
  page,
}) => {
  await page.goto("/mouse");
  await compareCheckbox(page, mouses.dragonflyA9Ultra.name).check();
  await page.getByRole("link", { name: `Detalhes de ${mouses.huan.name}` }).click();
  await expect(page.getByRole("dialog", { name: mouses.huan.name })).toBeVisible();
  await compareCheckbox(page, mouses.huan.name).check();
  const bothIds = `${mouses.dragonflyA9Ultra.id},${mouses.huan.id}`;
  await expect(page).toHaveURL(`/mouse/${mouses.huan.id}?cmp=${bothIds}`);

  await page.goBack();
  await expect(page).toHaveURL(`/mouse?cmp=${bothIds}`);
  await expect(compareCheckbox(page, mouses.dragonflyA9Ultra.name)).toBeChecked();
  await expect(compareCheckbox(page, mouses.huan.name)).toBeChecked();
});

test("regression: the browser's back after a mark on a detail opened from the Comparação returns to the Comparação", async ({
  page,
}) => {
  const bothIds = `${mouses.dragonflyA9Ultra.id},${mouses.huan.id}`;
  await page.goto(`/comparar/mouse?p=${bothIds}`);
  await page.getByRole("link", { name: mouses.huan.name, exact: true }).click();
  await expect(page).toHaveURL(`/mouse/${mouses.huan.id}?cmp=${bothIds}`);
  await page.getByRole("button", { name: "Remover da comparação" }).click();
  await expect(page).toHaveURL(`/mouse/${mouses.huan.id}?cmp=${mouses.dragonflyA9Ultra.id}`);

  await page.goBack();
  await expect(page).toHaveURL(`/comparar/mouse?p=${bothIds}`);
});

test("regression: the browser's back after a mark on a detail opened by a link returns to the page before it", async ({
  page,
}) => {
  await page.goto("/teclado");
  await page.goto(`/mouse/${mouses.huan.id}?cmp=${mouses.dragonflyA9Ultra.id}`);
  await page.getByRole("button", { name: "Adicionar à comparação" }).click();
  const bothIds = `${mouses.dragonflyA9Ultra.id},${mouses.huan.id}`;
  await expect(page).toHaveURL(`/mouse/${mouses.huan.id}?cmp=${bothIds}`);

  await page.goBack();
  await expect(page).toHaveURL("/teclado");
});

test.describe("with a weight that rounds to the one beside it", () => {
  // The data request is rewritten below; a service worker would answer it from its cache instead.
  test.use({ serviceWorkers: "block" });

  test("the Destaque compares values as the screen rounds them: 54,4 g ties with 54 g", async ({
    page,
  }) => {
    await page.route("**/data/mouse.json", async (route) => {
      const response = await route.fetch();
      const data = categoryDataSchema.parse(await response.json());
      const products = data.products.map((product) =>
        product.id === mouses.huan.id
          ? { ...product, values: { ...product.values, weight: 54 } }
          : product,
      );
      await route.fulfill({ response, json: { ...data, products } });
    });
    await page.goto(
      `/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.huan.id},${mouses.h200a.id}`,
    );
    // Dragonfly A9 Ultra weighs 54.4 g, shown as 54 g.
    await expect(page.getByRole("row", { name: /^Peso/ })).toMatchAriaSnapshot(`
      - rowheader "Peso"
      - cell "54 g melhor nesta medida"
      - cell "54 g melhor nesta medida"
      - cell "102 g"
    `);
    expect(await highlightedProducts(page, "Peso")).toEqual(["Dragonfly A9 Ultra", "Huan"]);
  });
});
