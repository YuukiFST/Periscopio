import { expect, test, type Page } from "@playwright/test";

/**
 * Runs against the production build served with the data the pipeline
 * generates from the recorded EyeJoker excerpt (`serve-fixture-build.ts`).
 */

const huanId = "201270eb-b392-4e41-96a9-1b609a77e795";
const edge60HeProId = "021979aa-b222-47d3-b5ec-8b59d671aff4";
const storageKey = "periscopio:vistos-recentemente";

function recentButton(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: "Recentes" });
}

/** Beside the table, the panel covers the end of the header, where Recentes is. */
async function closeDetails(page: Page) {
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

function recentList(page: Page) {
  return page.getByRole("dialog", { name: "Vistos recentemente" });
}

async function storedRecent(page: Page): Promise<{ id: string; category: string }[]> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]"), storageKey);
}

test("Recentes shows once a Produto opens, and Esc closes the list and gives focus back to it", async ({
  page,
}) => {
  await page.goto("/mouse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouses");
  await expect(recentButton(page)).toHaveCount(0);

  await page.getByRole("link", { name: "Huan" }).click();
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await closeDetails(page);
  await recentButton(page).click();
  await expect(recentList(page).getByRole("link")).toHaveText([/^Huan/]);

  await page.keyboard.press("Escape");
  await expect(recentList(page)).toHaveCount(0);
  await expect(recentButton(page)).toBeFocused();
});

test("the list holds the opened Produtos of every Categoria, newest first and once each, and opens one on its Categoria page", async ({
  page,
}) => {
  await page.goto(`/mouse/${huanId}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await page.goto(`/teclado/${edge60HeProId}`);
  await expect(page.getByRole("dialog", { name: "EDGE 60HE Pro" })).toBeVisible();
  await page.goto(`/mouse/${huanId}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();

  await page.goto("/monitor");
  await recentButton(page).click();
  await expect(recentList(page).getByRole("link")).toHaveText([
    /^Huan\s*Mouses\s*₩\s*239\.000$/,
    /^EDGE 60HE Pro\s*Teclados\s*₩\s*229\.000$/,
  ]);
  // The photos are decorative, next to each name.
  await expect(recentList(page).locator("img")).toHaveCount(2);

  await recentList(page)
    .getByRole("link", { name: /^EDGE 60HE Pro/ })
    .click();
  await expect(page).toHaveURL(`/teclado/${edge60HeProId}`);
  await expect(recentList(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");
  await expect(page.getByRole("dialog", { name: "EDGE 60HE Pro" })).toBeVisible();
});

test("a Produto of the Categoria on screen opens over its table, which keeps its search params", async ({
  page,
}) => {
  await page.goto(`/mouse/${huanId}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  const tableSearch = "?status=todos&q=dragon";
  await page.goto(`/mouse${tableSearch}`);
  await recentButton(page).click();
  await recentList(page).getByRole("link", { name: /^Huan/ }).click();

  await expect(page).toHaveURL(`/mouse/${huanId}${tableSearch}`);
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }),
  ).toHaveValue("dragon");
});

test("the history keeps 10 Produtos per Categoria and the list skips the ones the data lacks", async ({
  page,
}) => {
  await page.goto("/mouse");
  const goneMouseIds = Array.from(
    { length: 10 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  );
  await page.evaluate(
    ([key, mouseIds, keyboardId]) => {
      const viewedAt = new Date().toISOString();
      localStorage.setItem(
        key,
        JSON.stringify([
          ...mouseIds.map((id) => ({ id, category: "mouse", viewedAt })),
          { id: keyboardId, category: "teclado", viewedAt },
        ]),
      );
    },
    [storageKey, goneMouseIds, edge60HeProId] as const,
  );
  await page.reload();

  await page.getByRole("link", { name: "Huan" }).click();
  await expect(page.getByRole("dialog", { name: "Huan" })).toBeVisible();
  await expect
    .poll(() => storedRecent(page))
    .toMatchObject([
      { id: huanId, category: "mouse" },
      ...goneMouseIds.slice(0, 9).map((id) => ({ id, category: "mouse" })),
      { id: edge60HeProId, category: "teclado" },
    ]);

  await closeDetails(page);
  await recentButton(page).click();
  await expect(recentList(page).getByRole("link")).toHaveText([/^Huan/, /^EDGE 60HE Pro/]);
});

test("Limpar histórico asks first, then empties the list and hides Recentes", async ({ page }) => {
  await page.goto(`/teclado/${edge60HeProId}`);
  await expect(page.getByRole("dialog", { name: "EDGE 60HE Pro" })).toBeVisible();
  await closeDetails(page);
  await recentButton(page).click();
  await recentList(page).getByRole("button", { name: "Limpar histórico" }).click();
  // The first press only asks; Cancelar keeps the list.
  await expect(recentList(page).getByRole("link")).toHaveCount(1);
  await recentList(page).getByRole("button", { name: "Cancelar" }).click();
  // Cancelar leaves with the question, so the keyboard goes back to the button that asked it.
  await expect(recentList(page).getByRole("button", { name: "Limpar histórico" })).toBeFocused();
  await recentList(page).getByRole("button", { name: "Limpar histórico" }).click();
  // The answer repeats the action it confirms.
  await recentList(page).getByRole("button", { name: "Limpar histórico" }).click();

  await expect(recentList(page)).toHaveCount(0);
  await expect(recentButton(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.goto("/teclado");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teclados");
  await expect(recentButton(page)).toHaveCount(0);
});
