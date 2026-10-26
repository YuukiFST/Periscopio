import { expect, test, type Page } from "@playwright/test";

/**
 * The Gráfico of the fixture's 6 mouses (`serve-fixture-build.ts`). Tested ones,
 * by Preço and Nota geral: Dragonfly 3 PRO ₩ 27.800 Sem nota, H200A ₩ 29.900
 * Sem nota, Dragonfly A9 Ultra ₩ 98.900 A+, Huan ₩ 239.000 C.
 */

const huanId = "201270eb-b392-4e41-96a9-1b609a77e795";

function axisSelect(page: Page, name: "Eixo horizontal" | "Eixo vertical") {
  return page.getByRole("combobox", { name });
}

/** The names of the dots marked as Melhores relações. */
async function bestTradeOffNames(page: Page): Promise<string[]> {
  const labels = await page
    .getByRole("group", { name: /por/ })
    .getByRole("link", { name: /, melhor relação$/ })
    .evaluateAll((links) => links.map((link) => link.getAttribute("aria-label") ?? ""));
  return labels.map((label) => label.split(":")[0] ?? "");
}

test("the chart plots Preço by Nota geral and marks the best trade-offs of the axes picked", async ({
  page,
}) => {
  await page.goto("/grafico/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gráfico de mouses");
  await expect(axisSelect(page, "Eixo horizontal")).toHaveValue("preco");
  await expect(axisSelect(page, "Eixo vertical")).toHaveValue("nota");
  // The cheapest grade-less mouse and the best-graded one; the others lose on both axes to one of them.
  expect(await bestTradeOffNames(page)).toEqual(["Dragonfly 3 PRO", "Dragonfly A9 Ultra"]);
  await expect(page.getByRole("table", { name: "Dados do gráfico" })).toMatchAriaSnapshot(`
    - table "Dados do gráfico":
      - rowgroup:
        - row "Produto Preço (₩) Nota geral Melhor relação"
      - rowgroup:
        - row "Dragonfly 3 PRO ₩ 27.800 Sem nota Sim"
        - row "H200A ₩ 29.900 Sem nota Não"
        - row "Dragonfly A9 Ultra ₩ 98.900 A+ Sim"
        - row "Huan ₩ 239.000 C Não"
  `);

  await axisSelect(page, "Eixo horizontal").selectOption({ label: "Peso (g)" });
  await axisSelect(page, "Eixo vertical").selectOption({ label: "Resposta do clique (ms)" });

  await expect(page).toHaveURL("/grafico/mouse?x=peso&y=clique");
  await page.getByRole("link", { name: /^H200A: / }).hover();
  await expect(page.getByRole("tooltip")).toHaveText(
    "H200APeso (g)102 gResposta do clique (ms)8,91 ms",
  );
  // Lower is better on both: the lightest mouse and the fastest click.
  await expect(page.getByRole("link", { name: /^Huan: Peso \(g\) 48 g, / })).toBeVisible();
  expect(await bestTradeOffNames(page)).toEqual(["Huan", "Dragonfly A9 Ultra"]);
});

test("the chart shows the Produtos of the table's Filtros and leads back to the table as it was", async ({
  page,
}) => {
  const tableSearch = "?status=todos&peso=-55";
  await page.goto(`/mouse${tableSearch}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");

  await page.getByRole("link", { name: "Ver gráfico" }).click();

  await expect(page).toHaveURL(`/grafico/mouse${tableSearch}`);
  // Of the three mouses up to 55 g, Cloud XS has no Nota geral.
  await expect(
    page.getByText("Todos · 1 filtro: 2 produtos no gráfico, 1 sem dado em um dos eixos"),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Dados do gráfico" }).getByRole("rowheader"),
  ).toHaveText(["Dragonfly A9 Ultra", "Huan"]);

  await axisSelect(page, "Eixo vertical").selectOption({ label: "Peso (g)" });
  await page.getByRole("link", { name: "Voltar para Mouses" }).click();

  await expect(page).toHaveURL(`/mouse${tableSearch}`);
  await expect(page.getByRole("rowheader")).toHaveCount(3);
});

test("a dot opens its Produto over the table with the chart's Filtros", async ({ page }) => {
  await page.goto("/grafico/mouse?status=todos&peso=-55&x=peso&y=clique");

  await page.getByRole("link", { name: /^Huan: / }).focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "HuanPeso (g)48 gResposta do clique (ms)5,34 ms",
  );
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(`/mouse/${huanId}?status=todos&peso=-55`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await expect(page.getByRole("rowheader")).toHaveCount(3);
});
