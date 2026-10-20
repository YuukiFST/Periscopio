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

function choice(page: Page, filterName: string, choiceName: string) {
  return filterPanel(page)
    .getByRole("group", { name: filterName, exact: true })
    .getByRole("checkbox", { name: choiceName, exact: true });
}

const allMouses = [
  "Dragonfly A9 Ultra",
  "Huan",
  "Dragonfly 3 PRO",
  "H200A",
  "VK M5 Max THOR",
  "Cloud XS",
];

/**
 * The golden generalizes numbers into patterns, so the cuts EyeJoker draws
 * (screen sizes, refresh rates) and the letter tiers are spelled out here exactly.
 */
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
    url: "/mouse?formato=simetrico&ips=700-",
  },
  {
    slug: "teclado",
    exactChoices: {
      Layout: ["TKL", "75%", "65%", "60%", "Completo", "96%", "Outro"],
      "Desempenho real": [
        "4.000 Hz ou mais",
        "2.000 a 3.999 Hz",
        "1.000 a 1.999 Hz",
        "Menos de 1.000 Hz",
      ],
    },
    first: { filter: "Layout", choices: ["60%"] },
    afterFirst: ["TENKO - ARC 60", "EDGE 60HE Pro", "Raven61"],
    second: { filter: "Atraso com várias teclas", choices: ["Sem atraso"] },
    afterSecond: ["TENKO - ARC 60", "EDGE 60HE Pro"],
    url: "/teclado?layout=60&atraso=sem-atraso",
  },
  {
    slug: "monitor",
    exactChoices: {
      "Tamanho da tela": ['Até 23"', '24 a 25"', '27"', '32"', '34"', '39"', '45"', '49" ou mais'],
      Resolução: ["FHD (1920×1080)", "QHD (2560×1440)", "UHD (3840×2160)", "Ultrawide"],
      "Taxa de atualização": [
        "60 a 143 Hz",
        "144 a 239 Hz",
        "240 a 359 Hz",
        "360 a 539 Hz",
        "540 Hz ou mais",
      ],
      "Certificação HDR": [
        "True Black 400",
        "True Black 500",
        "True Black 600 ou mais",
        "DisplayHDR comum",
      ],
    },
    first: { filter: "Tamanho da tela", choices: ['24 a 25"'] },
    afterFirst: ["XG259QDNS Ace", "모비우스 EX2510S", "ROG SWIFT PG259QN"],
    // 모비우스 costs ₩ 280.000 but is discontinued, so no Preço holds it; XG259QDNS has none.
    second: { range: "Preço (mil ₩)", max: "900" },
    afterSecond: ["ROG SWIFT PG259QN"],
    url: "/monitor?tamanho=24-25&preco=-900",
  },
];

for (const category of categoryCases) {
  test(`/${category.slug} shows EyeJoker's Filtros in pt, and two Filtros together narrow the list`, async ({
    page,
  }) => {
    await page.goto(`/${category.slug}`);
    // Every Filtro is listed one under the other: none hides behind a disclosure.
    await expect(filterPanel(page).getByRole("button", { name: /avançados/ })).toHaveCount(0);
    await expect(filterPanel(page)).toMatchAriaSnapshot({
      name: `${category.slug}-filters.aria.yml`,
    });
    for (const [filterName, choiceNames] of Object.entries(category.exactChoices)) {
      const choices = filterPanel(page)
        .getByRole("group", { name: filterName, exact: true })
        .getByRole("checkbox");
      await expect(choices).toHaveCount(choiceNames.length);
      for (const [index, choiceName] of choiceNames.entries()) {
        await expect(choices.nth(index)).toHaveAccessibleName(choiceName);
      }
    }

    for (const name of category.first.choices) {
      await choice(page, category.first.filter, name).check();
    }
    await expect.poll(() => productNames(page)).toEqual(category.afterFirst);

    const { second } = category;
    if ("choices" in second) {
      for (const name of second.choices) await choice(page, second.filter, name).check();
    } else {
      const range = filterPanel(page).getByRole("group", { name: second.range });
      if (second.min) await range.getByRole("textbox", { name: "Mínimo" }).fill(second.min);
      if (second.max) await range.getByRole("textbox", { name: "Máximo" }).fill(second.max);
    }
    await expect(page).toHaveURL(category.url);
    await expect.poll(() => productNames(page)).toEqual(category.afterSecond);
  });
}

test("choices within one Filtro add up, and a Produto without the value leaves while the Filtro is active", async ({
  page,
}) => {
  await page.goto("/mouse");
  await choice(page, "Carcaça furada", "Não").check();
  await choice(page, "Carcaça furada", "Só embaixo").check();
  // VK M5 Max THOR does not say whether its shell has holes, so even both choices leave it out.
  await expect(page).toHaveURL("/mouse?furada=nao,so-embaixo");
  await expect(page.getByText("5 de 6 produtos")).toBeVisible();
  await expect
    .poll(() => productNames(page))
    .toEqual(allMouses.filter((name) => name !== "VK M5 Max THOR"));
});

test("the weight range keeps Produtos between the typed grams, and Limpar clears every Filtro", async ({
  page,
}) => {
  await page.goto("/mouse");
  const clearButton = filterPanel(page).getByRole("button", { name: "Limpar" });
  await expect(clearButton).toBeDisabled();

  const weightRange = filterPanel(page).getByRole("group", { name: "Peso (g)" });
  await weightRange.getByRole("textbox", { name: "Mínimo" }).fill("55");
  await weightRange.getByRole("textbox", { name: "Máximo" }).fill("60");
  await choice(page, "Formato", "Simétrico").check();
  await expect(page).toHaveURL("/mouse?peso=55-60&formato=simetrico");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly 3 PRO"]);

  await clearButton.click();
  await expect(page).toHaveURL("/mouse");
  await expect.poll(() => productNames(page)).toEqual(allMouses);
  await expect(choice(page, "Formato", "Simétrico")).not.toBeChecked();
  await expect(weightRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(weightRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("");
  await expect(clearButton).toBeDisabled();
  await expect(clearButton).toBeFocused();
});

test("regression: a weight typed key by key keeps the text the link has not caught up with", async ({
  page,
}) => {
  await page.goto("/mouse");
  const weightRange = filterPanel(page).getByRole("group", { name: "Peso (g)" });
  const minimum = weightRange.getByRole("textbox", { name: "Mínimo" });

  await minimum.pressSequentially("54,5");
  await expect(page).toHaveURL("/mouse?peso=54.5-");
  await minimum.press("Backspace");
  await expect(page).toHaveURL("/mouse?peso=54-");
  await expect(minimum).toHaveValue("54,");
  await minimum.pressSequentially("6a");
  await expect(page).toHaveURL("/mouse");
  await expect(minimum).toHaveValue("54,6a");
  await expect(minimum).toHaveAccessibleDescription(
    "Use um número com até 3 casas decimais, como 54,5.",
  );

  await choice(page, "Formato", "Simétrico").check();
  await filterPanel(page).getByRole("button", { name: "Limpar" }).click();
  await expect(minimum).toHaveValue("");
  await expect(minimum).not.toHaveAccessibleDescription(/./);
});

test("a copied link opens the same Filtros in a new tab", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/mouse");
  await choice(page, "Carcaça furada", "Só embaixo").check();
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
    furada: "so-embaixo",
    peso: "-50",
  });

  const newTab = await context.newPage();
  await newTab.goto(copiedLink);
  await expect.poll(() => productNames(newTab)).toEqual(expectedNames);
  await expect(choice(newTab, "Carcaça furada", "Só embaixo")).toBeChecked();
  const weightRange = filterPanel(newTab).getByRole("group", { name: "Peso (g)" });
  await expect(weightRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(weightRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("50");
});

test("marked sensors and a maximum Resposta do clique narrow the mouses and reopen from the link", async ({
  page,
  context,
}) => {
  await page.goto("/mouse");
  const sensorGroup = filterPanel(page).getByRole("group", { name: "Sensor", exact: true });
  // The sensors the excerpt's mouses have, by EyeJoker's label; four choices need no search box.
  const sensorChoices = sensorGroup.getByRole("checkbox");
  const sensorNames = ["PAW3395", "PAW3950", "PAW3950 HS", "PAW3950 Ultra (42K)"];
  await expect(sensorChoices).toHaveCount(sensorNames.length);
  for (const [index, name] of sensorNames.entries()) {
    await expect(sensorChoices.nth(index)).toHaveAccessibleName(name);
  }
  await expect(sensorGroup.getByRole("searchbox")).toHaveCount(0);

  await choice(page, "Sensor", "PAW3950").check();
  await choice(page, "Sensor", "PAW3395").check();
  await expect(page).toHaveURL("/mouse?sensor=paw3395,paw3950");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly 3 PRO", "H200A", "Cloud XS"]);

  // Dragonfly 3 PRO answers in 20.5 ms; Cloud XS has no Resposta do clique, so it leaves too.
  const clickRange = filterPanel(page).getByRole("group", { name: "Resposta do clique (ms)" });
  await clickRange.getByRole("textbox", { name: "Máximo" }).fill("9");
  await expect(page).toHaveURL("/mouse?sensor=paw3395,paw3950&clique=-9");
  await expect.poll(() => productNames(page)).toEqual(["H200A"]);

  const newTab = await context.newPage();
  await newTab.goto(page.url());
  await expect.poll(() => productNames(newTab)).toEqual(["H200A"]);
  await expect(choice(newTab, "Sensor", "PAW3950")).toBeChecked();
  await expect(choice(newTab, "Sensor", "PAW3395")).toBeChecked();
  const newTabClickRange = filterPanel(newTab).getByRole("group", {
    name: "Resposta do clique (ms)",
  });
  await expect(newTabClickRange.getByRole("textbox", { name: "Mínimo" })).toHaveValue("");
  await expect(newTabClickRange.getByRole("textbox", { name: "Máximo" })).toHaveValue("9");

  // Only mouses have them: on teclado the same params show no Filtro and narrow nothing.
  await newTab.goto("/teclado?sensor=paw3395,paw3950&clique=-9");
  await expect(newTab.getByText("4 produtos", { exact: true })).toBeVisible();
  await expect(filterPanel(newTab).getByRole("group", { name: "Sensor" })).toHaveCount(0);
  await expect(filterPanel(newTab).getByRole("group", { name: /Resposta do clique/ })).toHaveCount(
    0,
  );
});

test("a maximum Resposta do sensor narrows the mouses, like the Resposta do clique", async ({
  page,
}) => {
  await page.goto("/mouse");
  // Dragonfly A9 Ultra answers in 0.70 ms and Huan in 0.71 ms; Dragonfly 3 PRO and H200A take
  // several, and VK M5 Max THOR and Cloud XS have no Resposta do sensor, so they leave too.
  await filterPanel(page)
    .getByRole("group", { name: "Resposta do sensor (ms)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("1");
  await expect(page).toHaveURL("/mouse?resposta-sensor=-1");
  await expect.poll(() => productNames(page)).toEqual(["Dragonfly A9 Ultra", "Huan"]);
});

test("regression: a range bound typed from a shown value keeps the Produto that shows it", async ({
  page,
}) => {
  // Dragonfly 3 PRO answers in 6.3714 ms, shown as 6,37: a Máximo of 6,37 keeps it.
  await page.goto("/mouse?resposta-sensor=-6.37");
  await expect
    .poll(() => productNames(page))
    .toEqual(["Dragonfly A9 Ultra", "Huan", "Dragonfly 3 PRO", "H200A"]);
});

test("a link with invalid Filtro values keeps the valid ones and opens without an error", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/mouse?formato=assimetrico,quadrado&peso=leve&layout=60&furada=");
  await expect.poll(() => productNames(page)).toEqual(["H200A", "VK M5 Max THOR"]);
  await expect(choice(page, "Formato", "Assimétrico")).toBeChecked();

  await filterPanel(page)
    .getByRole("group", { name: "Peso (g)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("60");
  await expect(page).toHaveURL("/mouse?formato=assimetrico&peso=-60");
  await expect.poll(() => productNames(page)).toEqual(["VK M5 Max THOR"]);
  expect(pageErrors).toEqual([]);
});

test("on a phone the Filtros open in a drawer with Limpar and the count that closes it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mouse");
  await expect(filterPanel(page)).toBeHidden();

  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Filtros" });
  await drawer
    .getByRole("group", { name: "Peso (g)" })
    .getByRole("textbox", { name: "Máximo" })
    .fill("50");
  await drawer.getByRole("button", { name: "Ver 2 produtos" }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL("/mouse?peso=-50");
  await expect.poll(() => productNames(page)).toEqual(["Huan", "Cloud XS"]);

  await page.getByRole("button", { name: "Filtros (1)" }).click();
  await drawer.getByRole("button", { name: "Limpar" }).click();
  await drawer.getByRole("button", { name: "Ver 6 produtos" }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL("/mouse");
  await expect.poll(() => productNames(page)).toEqual(allMouses);
});

test.describe("with more sensors in use than fit without a search box", () => {
  // The data request is rewritten below; a service worker would answer it from its cache instead.
  test.use({ serviceWorkers: "block" });

  test("regression: the page itself never scrolls, only the Filtros panel and the table", async ({
    page,
  }) => {
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
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/mouse");
    await expect(
      filterPanel(page).getByRole("searchbox", { name: "Buscar sensor" }),
    ).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(768);
  });
});
