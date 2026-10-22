import { expect, test, type Page } from "@playwright/test";
import { categoryDataSchema } from "../../src/data/schema.ts";

/**
 * Filtros on the production build with the data the pipeline generates from
 * the recorded EyeJoker excerpt (`serve-fixture-build.ts`). Expected lists are
 * read off that excerpt by hand: 6 mouses, 4 teclados, 4 monitores, each list
 * in the table's default order.
 */

async function productNames(page: Page): Promise<string[]> {
  const rowHeaders = await page.getByRole("rowheader").allInnerTexts();
  return rowHeaders.map((text) => text.split("\n")[0] ?? "");
}

function filterPanel(page: Page) {
  return page.getByRole("complementary", { name: "Filtros" });
}

/** A list Filtro is one field; it reads "Todas" or the marked choices, in list order. */
function choiceField(page: Page, filterName: string) {
  return filterPanel(page).getByRole("combobox", { name: filterName, exact: true });
}

async function markChoice(page: Page, filterName: string, choiceName: string) {
  await choiceField(page, filterName).click();
  const option = page.getByRole("option", { name: choiceName, exact: true });
  await option.click();
  await expect(option).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

async function expectChoiceNames(page: Page, filterName: string, choiceNames: string[]) {
  await choiceField(page, filterName).click();
  const options = page.getByRole("listbox").getByRole("option");
  await expect(options).toHaveCount(choiceNames.length);
  for (const [index, choiceName] of choiceNames.entries()) {
    await expect(options.nth(index)).toHaveAccessibleName(choiceName);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
}

const allMouses = [
  "Dragonfly A9 Ultra",
  "Huan",
  "Dragonfly 3 PRO",
  "H200A",
  "VK M5 Max THOR",
  "Cloud XS",
];

/** The golden generalizes letters and numbers into patterns, so the tiers are spelled out here exactly. */
const ratingTiers = ["S", "A+", "A", "B", "C", "D", "Sem nota"];
const recommendations = ["Ótima", "Boa", "Fraca", "Evitar", "Pendente"];

type SecondFilter =
  | { filter: string; choices: string[] }
  | { range: string; min?: string; max?: string };

const categoryCases: {
  slug: string;
  exactChoices: Record<string, string[]>;
  first: { filter: string; choices: string[] };
  afterFirst: string[];
  second: SecondFilter;
  afterSecond: string[];
  url: string;
}[] = [
  {
    slug: "mouse",
    exactChoices: {
      "Nota geral": ratingTiers,
      Recomendação: recommendations,
      "Carcaça furada": ["Sim", "Não", "Só embaixo"],
    },
    first: { filter: "Formato", choices: ["Simétrico"] },
    afterFirst: ["Dragonfly A9 Ultra", "Huan", "Dragonfly 3 PRO", "H200A", "Cloud XS"],
    // Dragonfly 3 PRO and H200A track up to 650 IPS, the other three up to 750.
    second: { range: "Velocidade máxima de rastreio (IPS)", min: "700" },
    afterSecond: ["Dragonfly A9 Ultra", "Huan", "Cloud XS"],
    url: "/mouse?status=todos&formato=simetrico&ips=700-",
  },
  {
    slug: "teclado",
    exactChoices: {
      Layout: ["TKL", "75%", "65%", "60%", "Completo", "96%", "Outro"],
    },
    first: { filter: "Layout", choices: ["60%"] },
    afterFirst: ["TENKO - ARC 60", "EDGE 60HE Pro", "Raven61"],
    second: { filter: "Atraso com várias teclas", choices: ["Sem atraso"] },
    afterSecond: ["TENKO - ARC 60", "EDGE 60HE Pro"],
    url: "/teclado?status=todos&layout=60&atraso=sem-atraso",
  },
  {
    slug: "monitor",
    exactChoices: {
      Resolução: ["FHD (1920×1080)", "QHD (2560×1440)", "UHD (3840×2160)", "Ultrawide"],
      "Certificação HDR": [
        "True Black 400",
        "True Black 500",
        "True Black 600 ou mais",
        "DisplayHDR comum",
      ],
    },
    first: { filter: "Resolução", choices: ["FHD (1920×1080)"] },
    afterFirst: ["XG259QDNS Ace", "모비우스 EX2510S", "ROG SWIFT PG259QN"],
    // 모비우스 costs ₩ 280.000 but is discontinued, so no Preço holds it; XG259QDNS has none.
    second: { range: "Preço (mil ₩)", max: "900" },
    afterSecond: ["ROG SWIFT PG259QN"],
    url: "/monitor?status=todos&resolucao=fhd&preco=-900",
  },
];

for (const category of categoryCases) {
  test(`/${category.slug} shows EyeJoker's Filtros in pt, and two Filtros together narrow the list`, async ({
    page,
  }) => {
    await page.goto(`/${category.slug}?status=todos`);
    // Every Filtro is listed one under the other: none hides behind a disclosure.
    await expect(filterPanel(page).getByRole("button", { name: /avançados/ })).toHaveCount(0);
    await expect(filterPanel(page)).toMatchAriaSnapshot({
      name: `${category.slug}-filters.aria.yml`,
    });
    for (const [filterName, choiceNames] of Object.entries(category.exactChoices)) {
      await expectChoiceNames(page, filterName, choiceNames);
    }

    for (const name of category.first.choices) {
      await markChoice(page, category.first.filter, name);
    }
    await expect.poll(() => productNames(page)).toEqual(category.afterFirst);

    const { second } = category;
    if ("choices" in second) {
      for (const name of second.choices) await markChoice(page, second.filter, name);
    } else {
      const range = filterPanel(page).getByRole("group", { name: second.range });
      if (second.min) await range.getByRole("textbox", { name: "Mínimo" }).fill(second.min);
      if (second.max) await range.getByRole("textbox", { name: "Máximo" }).fill(second.max);
    }
    await expect(page).toHaveURL(category.url);
    await expect.poll(() => productNames(page)).toEqual(category.afterSecond);
  });
}

const rangeCases: {
  slug: string;
  range: string;
  min?: string;
  max?: string;
  url: string;
  after: string[];
}[] = [
  {
    // 24,5", 24,5" and 24"; UltraGear is 32".
    slug: "monitor",
    range: "Tamanho da tela (pol.)",
    min: "24",
    max: "25",
    url: "/monitor?status=todos&tamanho=24-25",
    after: ["XG259QDNS Ace", "모비우스 EX2510S", "ROG SWIFT PG259QN"],
  },
  {
    // 360, 165, 240 and 360 Hz.
    slug: "monitor",
    range: "Taxa de atualização (Hz)",
    min: "200",
    max: "300",
    url: "/monitor?status=todos&taxa=200-300",
    after: ["UltraGear 32GS95UE 4K Mode"],
  },
  {
    // Only UltraGear has a Resposta geral, 3,53 ms, so a Máximo of 3 leaves no monitor.
    slug: "monitor",
    range: "Resposta geral (ms)",
    max: "3",
    url: "/monitor?status=todos&resposta=-3",
    after: [],
  },
  {
    // 2.110, 6.155 and 2.630 Hz; Archon M3 has no Desempenho real.
    slug: "teclado",
    range: "Desempenho real (Hz)",
    min: "2500",
    url: "/teclado?status=todos&desempenho=2500-",
    after: ["TENKO - ARC 60", "Raven61"],
  },
];

for (const rangeCase of rangeCases) {
  test(`/${rangeCase.slug} narrows by a typed ${rangeCase.range}`, async ({ page }) => {
    await page.goto(`/${rangeCase.slug}?status=todos`);
    const range = filterPanel(page).getByRole("group", { name: rangeCase.range, exact: true });
    if (rangeCase.min) await range.getByRole("textbox", { name: "Mínimo" }).fill(rangeCase.min);
    if (rangeCase.max) await range.getByRole("textbox", { name: "Máximo" }).fill(rangeCase.max);
    await expect(page).toHaveURL(rangeCase.url);
    await expect.poll(() => productNames(page)).toEqual(rangeCase.after);
  });
}

test("a link with a band id from before the ranges drops that Filtro and keeps the others", async ({
  page,
}) => {
  await page.goto("/monitor?status=todos&taxa=540-ou-mais&resolucao=fhd");
  const refreshRange = filterPanel(page).getByRole("group", { name: "Taxa de atualização (Hz)" });
  await expect(refreshRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(refreshRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("");
  await expect(choiceField(page, "Resolução")).toHaveText("FHD (1920×1080)");
  await expect
    .poll(() => productNames(page))
    .toEqual(["XG259QDNS Ace", "모비우스 EX2510S", "ROG SWIFT PG259QN"]);
});

test("choices within one Filtro add up, and a Produto without the value leaves while the Filtro is active", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  await markChoice(page, "Carcaça furada", "Não");
  await markChoice(page, "Carcaça furada", "Só embaixo");
  // VK M5 Max THOR does not say whether its shell has holes, so even both choices leave it out.
  await expect(page).toHaveURL("/mouse?status=todos&furada=nao,so-embaixo");
  await expect(page.getByText("5 de 6 produtos")).toBeVisible();
  await expect
    .poll(() => productNames(page))
    .toEqual(allMouses.filter((name) => name !== "VK M5 Max THOR"));
});

test("the weight range keeps Produtos between the typed grams, and Limpar clears every Filtro", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  const clearButton = filterPanel(page).getByRole("button", { name: "Limpar" });
  await expect(clearButton).toBeDisabled();

  const weightRange = filterPanel(page).getByRole("group", { name: "Peso (g)" });
  await weightRange.getByRole("textbox", { name: "Mínimo" }).fill("55");
  await weightRange.getByRole("textbox", { name: "Máximo" }).fill("60");
  await markChoice(page, "Formato", "Simétrico");
  await expect(page).toHaveURL("/mouse?status=todos&peso=55-60&formato=simetrico");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly 3 PRO"]);

  await clearButton.click();
  await expect(page).toHaveURL("/mouse?status=todos");
  await expect.poll(() => productNames(page)).toEqual(allMouses);
  await expect(choiceField(page, "Formato")).toHaveText("Todas");
  await expect(weightRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(weightRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("");
  await expect(clearButton).toBeDisabled();
  await expect(clearButton).toBeFocused();
});

test("regression: a weight typed key by key keeps the text the link has not caught up with", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  const weightRange = filterPanel(page).getByRole("group", { name: "Peso (g)" });
  const minimum = weightRange.getByRole("textbox", { name: "Mínimo" });

  await minimum.pressSequentially("54,5");
  await expect(page).toHaveURL("/mouse?status=todos&peso=54.5-");
  await minimum.press("Backspace");
  await expect(page).toHaveURL("/mouse?status=todos&peso=54-");
  await expect(minimum).toHaveValue("54,");
  await minimum.pressSequentially("6a");
  await expect(page).toHaveURL("/mouse?status=todos");
  await expect(minimum).toHaveValue("54,6a");
  await expect(minimum).toHaveAccessibleDescription(
    "Use um número com até 3 casas decimais, como 54,5.",
  );

  await markChoice(page, "Formato", "Simétrico");
  await filterPanel(page).getByRole("button", { name: "Limpar" }).click();
  await expect(minimum).toHaveValue("");
  await expect(minimum).not.toHaveAccessibleDescription(/./);
});

test("a copied link opens the same Filtros in a new tab", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/mouse?status=todos");
  await markChoice(page, "Carcaça furada", "Só embaixo");
  await filterPanel(page)
    .getByRole("group", { name: "Peso (g)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("50");
  const expectedNames = ["Huan", "Cloud XS"];
  await expect.poll(() => productNames(page)).toEqual(expectedNames);

  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByRole("button", { name: "Link copiado" })).toBeVisible();
  const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(Object.fromEntries(new URL(copiedLink).searchParams)).toEqual({
    status: "todos",
    furada: "so-embaixo",
    peso: "-50",
  });

  const newTab = await context.newPage();
  await newTab.goto(copiedLink);
  await expect.poll(() => productNames(newTab)).toEqual(expectedNames);
  await expect(choiceField(newTab, "Carcaça furada")).toHaveText("Só embaixo");
  const weightRange = filterPanel(newTab).getByRole("group", { name: "Peso (g)" });
  await expect(weightRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(weightRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("50");
});

test("marked sensors and a maximum Resposta do clique narrow the mouses and reopen from the link", async ({
  page,
  context,
}) => {
  await page.goto("/mouse?status=todos");
  // The sensors the excerpt's mouses have, by EyeJoker's label; four choices need no search box.
  const sensorNames = ["PAW3395", "PAW3950", "PAW3950 HS", "PAW3950 Ultra (42K)"];
  await expectChoiceNames(page, "Sensor", sensorNames);
  await expect(filterPanel(page).getByRole("combobox", { name: "Buscar sensor" })).toHaveCount(0);

  await markChoice(page, "Sensor", "PAW3950");
  await markChoice(page, "Sensor", "PAW3395");
  await expect(page).toHaveURL("/mouse?status=todos&sensor=paw3395,paw3950");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly 3 PRO", "H200A", "Cloud XS"]);

  // Dragonfly 3 PRO answers in 20.5 ms; Cloud XS has no Resposta do clique, so it leaves too.
  const clickRange = filterPanel(page).getByRole("group", { name: "Resposta do clique (ms)" });
  await clickRange.getByRole("textbox", { name: "Máximo" }).fill("9");
  await expect(page).toHaveURL("/mouse?status=todos&sensor=paw3395,paw3950&clique=-9");
  await expect.poll(() => productNames(page)).toEqual(["H200A"]);

  const newTab = await context.newPage();
  await newTab.goto(page.url());
  await expect.poll(() => productNames(newTab)).toEqual(["H200A"]);
  await expect(choiceField(newTab, "Sensor")).toHaveText("PAW3395, PAW3950");
  const newTabClickRange = filterPanel(newTab).getByRole("group", {
    name: "Resposta do clique (ms)",
  });
  await expect(newTabClickRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(newTabClickRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("9");

  // Only mouses have them: on teclado the same params show no Filtro and narrow nothing.
  await newTab.goto("/teclado?status=todos&sensor=paw3395,paw3950&clique=-9");
  await expect(newTab.getByText("4 produtos", { exact: true })).toBeVisible();
  await expect(filterPanel(newTab).getByRole("combobox", { name: "Sensor" })).toHaveCount(0);
  await expect(filterPanel(newTab).getByRole("group", { name: /Resposta do clique/ })).toHaveCount(
    0,
  );
});

test("a maximum Resposta do sensor narrows the mouses, like the Resposta do clique", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  // Dragonfly A9 Ultra answers in 0.70 ms and Huan in 0.71 ms; Dragonfly 3 PRO and H200A take
  // several, and VK M5 Max THOR and Cloud XS have no Resposta do sensor, so they leave too.
  await filterPanel(page)
    .getByRole("group", { name: "Resposta do sensor (ms)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("1");
  await expect(page).toHaveURL("/mouse?status=todos&resposta-sensor=-1");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly A9 Ultra", "Huan"]);
});

test("regression: a range bound typed from a shown value keeps the Produto that shows it", async ({
  page,
}) => {
  // Dragonfly 3 PRO answers in 6.3714 ms, shown as 6,37: a Máximo of 6,37 keeps it.
  await page.goto("/mouse?status=todos&resposta-sensor=-6.37");
  await expect
    .poll(() => productNames(page))
    .toEqual(["Dragonfly A9 Ultra", "Huan", "Dragonfly 3 PRO", "H200A"]);
});

test("a link with invalid Filtro values keeps the valid ones and opens without an error", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/mouse?status=todos&formato=assimetrico,quadrado&peso=leve&layout=60&furada=");
  await expect.poll(() => productNames(page)).toEqual(["H200A", "VK M5 Max THOR"]);
  await expect(choiceField(page, "Formato")).toHaveText("Assimétrico");

  await filterPanel(page)
    .getByRole("group", { name: "Peso (g)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("60");
  await expect(page).toHaveURL("/mouse?status=todos&formato=assimetrico&peso=-60");
  await expect.poll(() => productNames(page)).toEqual(["VK M5 Max THOR"]);
  expect(pageErrors).toEqual([]);
});

test("on a phone the Filtros open in a drawer with Limpar and the count that closes it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mouse?status=todos");
  await expect(filterPanel(page)).toBeHidden();

  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Filtros" });
  await drawer
    .getByRole("group", { name: "Peso (g)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("50");
  await drawer.getByRole("button", { name: "Ver 2 produtos" }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL("/mouse?status=todos&peso=-50");
  await expect.poll(() => productNames(page)).toEqual(["Huan", "Cloud XS"]);

  await page.getByRole("button", { name: "Filtros (1)" }).click();
  await drawer.getByRole("button", { name: "Limpar" }).click();
  await drawer.getByRole("button", { name: "Ver 6 produtos" }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL("/mouse?status=todos");
  await expect.poll(() => productNames(page)).toEqual(allMouses);
});

function activeFilterChips(page: Page) {
  return page.getByRole("list", { name: "Filtros ativos" });
}

test("a chip per active Filtro reads its choices or bounds, and the busca and Status de teste are none", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  await expect.poll(() => productNames(page)).toEqual(allMouses);
  await expect(activeFilterChips(page)).toHaveCount(0);

  await page.goto(
    "/mouse?status=todos&q=dragon&nota=s,a-mais,a&peso=50-60&sensor=paw3395,paw3950&resposta-sensor=0.7-&clique=-9",
  );
  await expect(activeFilterChips(page).getByRole("listitem")).toHaveText([
    "Nota geral: S +2",
    "Peso: 50–60 g",
    "Sensor: PAW3395, PAW3950",
    "Resposta do sensor: a partir de 0,7 ms",
    "Resposta do clique: até 9 ms",
  ]);
});

test("removing a chip drops its Filtro from the link and the panel, and focus moves to the next chip", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos&formato=simetrico&peso=55-60&sensor=paw3395");
  const historyLength = await page.evaluate(() => history.length);
  const weightRange = filterPanel(page).getByRole("group", { name: "Peso (g)" });
  await expect(weightRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("55");

  await page.getByRole("button", { name: "Remover filtro Peso" }).click();
  await expect(page).toHaveURL("/mouse?status=todos&formato=simetrico&sensor=paw3395");
  await expect(weightRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(weightRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Remover filtro Sensor" })).toBeFocused();

  // The last chip in the row hands focus back to the one before it.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/mouse?status=todos&formato=simetrico");
  await expect(choiceField(page, "Sensor")).toHaveText("Todas");
  await expect(page.getByRole("button", { name: "Remover filtro Formato" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/mouse?status=todos");
  await expect(activeFilterChips(page)).toHaveCount(0);
  await expect(
    page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }),
  ).toBeFocused();
  await expect.poll(() => productNames(page)).toEqual(allMouses);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
});

test("on a phone a Filtro applied in the drawer leaves the link by its chip", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mouse?status=todos");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Filtros" });
  await drawer
    .getByRole("group", { name: "Peso (g)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("50");
  await drawer.getByRole("button", { name: "Ver 2 produtos" }).click();
  await expect(drawer).toBeHidden();
  await expect(activeFilterChips(page).getByRole("listitem")).toHaveText(["Peso: até 50 g"]);
  await expect(page.getByRole("button", { name: "Filtros (1)" })).toBeVisible();

  await page.getByRole("button", { name: "Remover filtro Peso" }).click();
  await expect(page).toHaveURL("/mouse?status=todos");
  await expect(page.getByRole("button", { name: "Filtros", exact: true })).toBeVisible();
  await expect(activeFilterChips(page)).toHaveCount(0);
  await expect.poll(() => productNames(page)).toEqual(allMouses);
});

test.describe("with more sensors in use than fit without a search box", () => {
  // The data request is rewritten below; a service worker would answer it from its cache instead.
  test.use({ serviceWorkers: "block" });

  test.beforeEach(async ({ page }) => {
    await page.route("**/data/mouse.json", async (route) => {
      const response = await route.fetch();
      const data = categoryDataSchema.parse(await response.json());
      const sensorField = data.fields.find((field) => field.key === "sensor");
      const [model] = data.products;
      if (sensorField?.type !== "enum" || !model) throw new Error("the excerpt lost its mouses");
      // A copy of the first mouse per sensor, past the 12 choices a list shows without search.
      const copies = sensorField.options.slice(0, 13).map((option, index) => ({
        ...model,
        id: `${model.id.slice(0, -2)}${String(index).padStart(2, "0")}`,
        values: { ...model.values, sensor: option.value },
      }));
      await route.fulfill({ response, json: { ...data, products: [...data.products, ...copies] } });
    });
  });

  test("regression: the page itself never scrolls, only the Filtros panel and the table", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/mouse?status=todos");
    await expect(filterPanel(page).getByRole("combobox", { name: "Buscar sensor" })).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(768);
  });

  test("the Sensor field opens a list on click and typing narrows it", async ({ page }) => {
    await page.goto("/mouse?status=todos");
    const search = filterPanel(page).getByRole("combobox", { name: "Buscar sensor" });
    await search.click();
    const options = page.getByRole("listbox").getByRole("option");
    expect(await options.count()).toBeGreaterThan(12);

    await search.fill("paw 3950");
    for (const name of await options.allInnerTexts()) expect(name).toMatch(/PAW3950/);
    await page.getByRole("option", { name: "PAW3950", exact: true }).click();
    await expect(page).toHaveURL("/mouse?status=todos&sensor=paw3950");

    await search.fill("nenhum sensor assim");
    await expect(page.getByText("Nenhuma opção encontrada.")).toBeVisible();
    await page.keyboard.press("Escape");

    await filterPanel(page).getByRole("button", { name: "Remover PAW3950" }).click();
    await expect(page).toHaveURL("/mouse?status=todos");
  });
});

const presetCases: { slug: string; preset: string; url: string; after: string[] }[] = [
  {
    // Every excerpt mouse is wireless with a cable; H200A weighs 102 g.
    slug: "mouse",
    preset: "Sem fio leve",
    url: "/mouse?status=todos&conexao=sem-fio,com-e-sem-fio&peso=-60",
    after: ["Cloud XS", "Dragonfly 3 PRO", "Dragonfly A9 Ultra", "Huan", "VK M5 Max THOR"],
  },
  {
    slug: "teclado",
    preset: "Magnético",
    url: "/teclado?status=todos&switch=magnetico",
    after: ["Archon M3 600 MAX", "EDGE 60HE Pro", "Raven61", "TENKO - ARC 60"],
  },
  {
    // 360, 165, 240 and 360 Hz.
    slug: "monitor",
    preset: "240 Hz ou mais",
    url: "/monitor?status=todos&taxa=240-",
    after: ["ROG SWIFT PG259QN", "UltraGear 32GS95UE 4K Mode", "XG259QDNS Ace"],
  },
  {
    // QD-OLED and WOLED; the other two are IPS.
    slug: "monitor",
    preset: "OLED",
    url: "/monitor?status=todos&painel=oled",
    after: ["UltraGear 32GS95UE 4K Mode", "XG259QDNS Ace"],
  },
];

for (const presetCase of presetCases) {
  test(`/${presetCase.slug} preset ${presetCase.preset} marks its Filtros`, async ({ page }) => {
    await page.goto(`/${presetCase.slug}?status=todos`);
    const preset = filterPanel(page).getByRole("button", { name: presetCase.preset, exact: true });
    await expect(preset).toHaveAttribute("aria-pressed", "false");
    await preset.click();
    await expect(page).toHaveURL(presetCase.url);
    await expect(preset).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await productNames(page)).toSorted()).toEqual(presetCase.after);
  });
}

test("a preset replaces the Filtros only, shows pressed while the link matches it, and unpresses", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos&q=dragonfly&formato=assimetrico&peso=50-");
  const preset = filterPanel(page).getByRole("button", { name: "Sem fio leve" });
  await preset.click();
  await expect(page).toHaveURL(
    "/mouse?status=todos&q=dragonfly&peso=-60&conexao=sem-fio,com-e-sem-fio",
  );
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly A9 Ultra", "Dragonfly 3 PRO"]);
  await expect(choiceField(page, "Formato")).toHaveText("Todas");
  const weightRange = filterPanel(page).getByRole("group", { name: "Peso (g)" });
  await expect(weightRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(weightRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("60");
  await expect(preset).toHaveAttribute("aria-pressed", "true");

  // One more Filtro and the link is no longer exactly the preset.
  await markChoice(page, "Formato", "Simétrico");
  await expect(preset).toHaveAttribute("aria-pressed", "false");
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");

  await preset.click();
  await expect(page).toHaveURL("/mouse?status=todos&q=dragonfly");
  await expect(preset).toHaveAttribute("aria-pressed", "false");
});

test("saved Filtros keep a name per Categoria, apply from the drawer and can be deleted", async ({
  page,
}) => {
  await page.goto("/mouse?status=todos");
  const saveButton = filterPanel(page).getByRole("button", { name: "Salvar filtros atuais" });
  await expect(saveButton).toBeDisabled();

  await markChoice(page, "Carcaça furada", "Só embaixo");
  await filterPanel(page)
    .getByRole("group", { name: "Peso (g)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("50");
  await saveButton.click();
  await filterPanel(page).getByRole("textbox", { name: "Nome" }).fill("  Leves furados  ");
  await filterPanel(page).getByRole("button", { name: "Salvar", exact: true }).click();
  const savedList = filterPanel(page).getByRole("list", { name: "Filtros salvos" });
  await expect(
    savedList.getByRole("button", { name: "Leves furados", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(saveButton).toBeFocused();

  // Saved on this device for mouses only, so a teclado lists none.
  await page.goto("/teclado?status=todos");
  await expect(filterPanel(page).getByRole("list", { name: "Filtros salvos" })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mouse?q=huan");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Filtros" });
  await drawer.getByRole("button", { name: "Leves furados", exact: true }).click();
  await expect(page).toHaveURL("/mouse?q=huan&peso=-50&furada=so-embaixo");
  await drawer.getByRole("button", { name: "Ver 1 produto" }).click();
  await expect.poll(() => productNames(page)).toEqual(["Huan"]);

  await page.getByRole("button", { name: "Filtros (2)" }).click();
  await drawer.getByRole("button", { name: "Apagar Leves furados" }).click();
  await expect(drawer.getByRole("list", { name: "Filtros salvos" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Filtros (2)" }).click();
  await expect(drawer.getByRole("button", { name: "Sem fio leve" })).toBeVisible();
  await expect(drawer.getByRole("list", { name: "Filtros salvos" })).toHaveCount(0);
});

test.describe("with mouse data that has no weight", () => {
  // The data request is rewritten below; a service worker would answer it from its cache instead.
  test.use({ serviceWorkers: "block" });

  test("the preset that needs the Peso Filtro is hidden", async ({ page }) => {
    await page.route("**/data/mouse.json", async (route) => {
      const response = await route.fetch();
      const data = categoryDataSchema.parse(await response.json());
      const fields = data.fields.filter((field) => field.key !== "weight");
      await route.fulfill({ response, json: { ...data, fields } });
    });
    await page.goto("/mouse?status=todos");
    await expect(filterPanel(page).getByRole("group", { name: "Peso (g)" })).toHaveCount(0);
    await expect(filterPanel(page).getByRole("button", { name: "Sem fio leve" })).toHaveCount(0);
  });
});
