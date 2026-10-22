import { expect, test, type Page } from "@playwright/test";
import { categoryDataSchema, type Product } from "../../src/data/schema.ts";

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
const keyboards = {
  edge60HePro: { id: "021979aa-b222-47d3-b5ec-8b59d671aff4", name: "EDGE 60HE Pro" },
  raven61: { id: "479c4333-c25b-4e79-89a5-74d93565c4b5", name: "Raven61" },
};
const highlightLabel = "melhor nesta linha";
const tieLabel = "empate nesta linha";

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

/**
 * The names, in column order, of the Produtos whose cell in the field row of
 * `fieldLabel` carries `markLabel`; the Resumo de desempenho is left out.
 */
async function markedProducts(
  page: Page,
  fieldLabel: string,
  markLabel: string,
): Promise<string[]> {
  const table = page.getByRole("table", { name: /^Comparação de / });
  await expect(table).toBeVisible();
  const names = await comparedProductNames(page);
  const cells = table
    .getByRole("rowgroup")
    .filter({ hasNot: page.getByRole("rowheader", { name: /^Pontuação/ }) })
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

/**
 * Serves the category's data with `edit` applied to each Produto. The test
 * using it blocks service workers, which would answer from their cache.
 */
async function editProducts(
  page: Page,
  category: "mouse" | "teclado",
  edit: (product: Product) => Product,
) {
  await page.route(`**/data/${category}.json`, async (route) => {
    const response = await route.fetch();
    const data = categoryDataSchema.parse(await response.json());
    await route.fulfill({ response, json: { ...data, products: data.products.map(edit) } });
  });
}

function withValues(product: Product, id: string, values: Product["values"]): Product {
  return product.id === id ? { ...product, values: { ...product.values, ...values } } : product;
}

function summaryRows(page: Page) {
  return page.getByRole("rowgroup", { name: "Resumo de desempenho" });
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
    // A tie at the best value highlights both, as a Destaque.
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
  // A clear winner is a Destaque, never an Empate, nor is a tie at the best that others miss.
  expect(await markedProducts(page, "Peso", tieLabel)).toEqual([]);
  expect(await markedProducts(page, "Velocidade máxima de rastreio", tieLabel)).toEqual([]);
  await expect(page.getByRole("rowheader", { name: "Preço" })).toHaveCount(0);
  await expect(
    page.getByText(
      "O preço fica de fora da comparação porque preços mudam, e o EyeJoker não registra o preço da sua região.",
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

test("the Resumo de desempenho opens the table and ranks the mouses by their fastest click and sensor, whatever the connection", async ({
  page,
}) => {
  await page.goto(
    `/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.huan.id},${mouses.h200a.id}`,
  );
  await expect(page.getByRole("radio", { name: "Qualquer conexão" })).toBeChecked();
  await expect(
    page.getByText(
      "Melhor desempenho: Dragonfly A9 Ultra, com pontuação 100. Depois vem Huan, com 54.",
    ),
  ).toBeVisible();
  // H200A's sensor is fastest on its cable, 1,87 ms against 3,74 ms without it.
  await expect(summaryRows(page)).toMatchAriaSnapshot(`
    - rowgroup "Resumo de desempenho":
      - row "Resumo de desempenho"
      - row "Pontuação 100 = o mais rápido em tudo 1º 100 melhor nesta linha 2º 54 3º 21"
      - row "Resposta do clique 0,49 ms melhor nesta linha 5,34 ms 8,91 ms"
      - row "Resposta mais rápida do sensor 0,70 ms melhor nesta linha 0,71 ms 1,87 ms com fio"
  `);
});

test("choosing Com fio ranks the mouses on their wired times alone, opens their wired Medições, and stays in the link", async ({
  page,
}) => {
  const comparedIds = [mouses.dragonflyA9Ultra, mouses.huan, mouses.h200a, mouses.dragonfly3Pro]
    .map((mouse) => mouse.id)
    .join(",");
  await page.goto(`/comparar/mouse?p=${comparedIds}`);
  await page.getByRole("radio", { name: "Com fio" }).check();
  await expect(page).toHaveURL(`/comparar/mouse?p=${comparedIds}&conexao=com-fio`);
  await expect(
    page.getByText(
      "Melhor desempenho com fio: Huan, com pontuação 100. Depois vem Dragonfly 3 PRO, com 35.",
    ),
  ).toBeVisible();
  // Dragonfly A9 Ultra has no wired Medição, so it is out of the ranking, not last.
  await expect(summaryRows(page)).toMatchAriaSnapshot(`
    - rowgroup "Resumo de desempenho":
      - row "Resumo de desempenho"
      - row "Pontuação 100 = o mais rápido em tudo Sem medição com fio 1º 100 melhor nesta linha 3º 25 2º 35"
      - row "Resposta do clique (ao pressionar) Sem dado 0,30 ms melhor nesta linha 2,38 ms 19,44 ms"
      - row "Resposta mais rápida do sensor Sem dado 0,71 ms melhor nesta linha 1,87 ms 1,04 ms"
  `);
  // The wired Medições show open, without the wireless ones or a fold button.
  await expect(page.getByRole("rowgroup", { name: "Medições com fio" })).toBeVisible();
  await expect(
    page.getByRole("rowheader", { name: "Resposta média do sensor (com fio)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("rowheader", { name: "Resposta média do sensor (sem fio)", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Mostrar/ })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("radio", { name: "Com fio" })).toBeChecked();
  await page.getByRole("radio", { name: "Qualquer conexão" }).check();
  await expect(page).toHaveURL(`/comparar/mouse?p=${comparedIds}`);
  await expect(
    page.getByText(
      "Melhor desempenho: Dragonfly A9 Ultra, com pontuação 100. Depois vem Huan, com 54.",
    ),
  ).toBeVisible();
});

test("one measured mouse still gets the Resumo de desempenho, which says it is the only one", async ({
  page,
}) => {
  await page.goto(`/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.vkM5MaxThor.id}`);
  await expect(page.getByText("Só Dragonfly A9 Ultra tem as medições do resumo.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Com fio" })).toBeVisible();
});

test("a monitor Comparação has no Resumo de desempenho nor connection choice", async ({ page }) => {
  await page.goto(`/comparar/monitor?p=${ultraGearId},${pg259qnId}`);
  await expect(page.getByRole("table", { name: "Comparação de monitores" })).toBeVisible();
  await expect(summaryRows(page)).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
});

test("a mouse's Medições por conexão start folded and unfold on request", async ({ page }) => {
  await page.goto(`/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.h200a.id}`);
  const perConnectionRow = page.getByRole("rowheader", {
    name: "Resposta média do sensor (com fio)",
    exact: true,
  });
  const unfold = page.getByRole("button", { name: /^Mostrar \(\d+\)$/ });
  await expect(unfold).toHaveAttribute("aria-expanded", "false");
  await expect(unfold).toHaveAccessibleDescription("Medições por conexão");
  await expect(perConnectionRow).toHaveCount(0);
  // The overall Medições stay in view.
  await expect(
    page
      .getByRole("rowgroup", { name: "Medições", exact: true })
      .getByRole("rowheader", { name: "Resposta do clique", exact: true }),
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
  await expect(page.getByRole("row", { name: /^Tamanho da tela/ })).toContainText("32″");
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
      - cell "54 g melhor nesta linha"
      - cell "54 g melhor nesta linha"
      - cell "102 g"
    `);
    expect(await highlightedProducts(page, "Peso")).toEqual(["Dragonfly A9 Ultra", "Huan"]);
  });
});

test.describe("with edited data", () => {
  test.use({ serviceWorkers: "block" });

  test("regression: a time EyeJoker could not measure (-1) shows as missing, not as -1,00 ms, and leaves the mouse unranked", async ({
    page,
  }) => {
    await editProducts(page, "mouse", (product) =>
      withValues(product, mouses.h200a.id, { pcbAvgWired: -1 }),
    );
    await page.goto(
      `/comparar/mouse?p=${mouses.huan.id},${mouses.h200a.id},${mouses.dragonfly3Pro.id}&conexao=com-fio`,
    );
    await expect(
      page.getByRole("row", { name: /^Resposta média do clique \(com fio, ao pressionar\)/ }),
    ).toMatchAriaSnapshot(`
      - row "Resposta média do clique (com fio, ao pressionar) 0,30 ms melhor nesta linha Sem dado 19,44 ms"
    `);
    await expect(summaryRows(page).getByRole("row", { name: /^Pontuação/ })).toMatchAriaSnapshot(`
      - row "Pontuação 100 = o mais rápido em tudo 1º 100 melhor nesta linha Falta uma medição com fio 2º 35"
    `);
  });

  test("regression: a connection in the link leaves the Medições whole when no connection can rank these mouses", async ({
    page,
  }) => {
    // A Medição per connection, but no response time to rank on.
    await editProducts(page, "mouse", (product) =>
      withValues(product, mouses.vkM5MaxThor.id, { detachAvgWired: 5, detachAvgWireless: 6 }),
    );
    await page.goto(
      `/comparar/mouse?p=${mouses.vkM5MaxThor.id},${mouses.cloudXs.id}&conexao=com-fio`,
    );
    await expect(page.getByRole("rowgroup", { name: "Medições por conexão" })).toHaveCount(1);
    await expect(page.getByRole("rowgroup", { name: "Medições com fio" })).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(summaryRows(page)).toHaveCount(0);
  });

  test("Sem fio tells a wired-only mouse and one missing a wireless Medição apart", async ({
    page,
  }) => {
    await editProducts(page, "mouse", (product) =>
      withValues(product, mouses.huan.id, { mouseConnection: "유선" }),
    );
    await page.goto(
      `/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.huan.id},${mouses.h200a.id},${mouses.dragonfly3Pro.id}&conexao=sem-fio`,
    );
    await expect(page.getByRole("radio", { name: "Sem fio" })).toBeChecked();
    await expect(summaryRows(page).getByRole("row", { name: /^Pontuação/ })).toMatchAriaSnapshot(`
      - row "Pontuação 100 = o mais rápido em tudo 1º 100 melhor nesta linha Só com fio 2º 15 3º 7"
    `);
  });

  test("a battery of AA or X has no mAh to compare and gets no Destaque", async ({ page }) => {
    await editProducts(page, "mouse", (product) =>
      withValues(product, mouses.dragonflyA9Ultra.id, { battery: "AA" }),
    );
    await page.goto(
      `/comparar/mouse?p=${mouses.dragonflyA9Ultra.id},${mouses.huan.id},${mouses.h200a.id}`,
    );
    expect(await highlightedProducts(page, "Bateria")).toEqual(["H200A"]);
  });

  test("a keyboard debounce of 0 ms is a measurement and takes the Destaque", async ({ page }) => {
    await editProducts(page, "teclado", (product) =>
      withValues(
        withValues(product, keyboards.edge60HePro.id, { debounceTime: 0 }),
        keyboards.raven61.id,
        { debounceTime: 5 },
      ),
    );
    await page.goto(`/comparar/teclado?p=${keyboards.edge60HePro.id},${keyboards.raven61.id}`);
    expect(await highlightedProducts(page, "Tempo de debounce")).toEqual([
      keyboards.edge60HePro.name,
    ]);
  });
});
