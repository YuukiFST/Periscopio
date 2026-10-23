import { expect, test, type Page } from "@playwright/test";

/**
 * A phone with Web Share gets "Compartilhar" in place of "Copiar link".
 * Chromium has no share sheet to drive, so each test stubs `navigator.share`
 * before the app loads; a touch context makes `(pointer: coarse)` match.
 */

type ShareOutcome = "shared" | "AbortError" | "NotAllowedError";
type CopyOutcome = "copied" | "NotAllowedError";

declare global {
  interface Window {
    sharedData: ShareData[];
    copiedTexts: string[];
  }
}

async function stubShare(page: Page, shareOutcome: ShareOutcome, copyOutcome: CopyOutcome) {
  await page.addInitScript(
    (outcomes: { share: ShareOutcome; copy: CopyOutcome }) => {
      window.sharedData = [];
      window.copiedTexts = [];
      Object.defineProperty(navigator, "canShare", { value: () => true });
      // Both stubs reject at once, so the failure lands while the click that caused it still
      // bubbles: the case where the popover used to close on its own opening click.
      Object.defineProperty(navigator, "share", {
        value: async (data: ShareData) => {
          window.sharedData.push(data);
          if (outcomes.share !== "shared") {
            throw new DOMException("Share failed", outcomes.share);
          }
        },
      });
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text: string) => {
            window.copiedTexts.push(text);
            if (outcomes.copy !== "copied") {
              throw new DOMException("Write denied", outcomes.copy);
            }
          },
        },
      });
    },
    { share: shareOutcome, copy: copyOutcome },
  );
}

function sharedData(page: Page) {
  return page.evaluate(() => window.sharedData);
}

function copiedTexts(page: Page) {
  return page.evaluate(() => window.copiedTexts);
}

test("a fine pointer keeps Copiar link even where Web Share exists", async ({ page }) => {
  await stubShare(page, "shared", "copied");
  await page.goto("/mouse?status=todos");

  await page.getByRole("button", { name: "Copiar link" }).click();

  await expect(page.getByRole("button", { name: "Link copiado" })).toBeVisible();
  expect(await copiedTexts(page)).toEqual([page.url()]);
  expect(await sharedData(page)).toEqual([]);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test("Compartilhar sends the title and the link with the current search", async ({ page }) => {
    await stubShare(page, "shared", "copied");
    await page.goto("/mouse?status=todos");
    await page.getByRole("searchbox", { name: "Buscar por produto ou fabricante" }).fill("dragon");
    await expect(page).toHaveURL(/q=dragon/);

    await page.getByRole("button", { name: "Compartilhar" }).click();

    await expect.poll(() => sharedData(page)).toHaveLength(1);
    const [shared] = await sharedData(page);
    expect(shared?.title).toBe(await page.title());
    expect(Object.fromEntries(new URL(shared?.url ?? "").searchParams)).toEqual({
      status: "todos",
      q: "dragon",
    });
    expect(await copiedTexts(page)).toEqual([]);
    await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();
  });

  test("closing the share sheet shows nothing and copies nothing", async ({ page }) => {
    await stubShare(page, "AbortError", "copied");
    await page.goto("/mouse");

    await page.getByRole("button", { name: "Compartilhar" }).click();

    await expect.poll(() => sharedData(page)).toHaveLength(1);
    expect(await copiedTexts(page)).toEqual([]);
    await expect(page.getByRole("textbox", { name: "Link desta página" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();
  });

  test("a failed share falls back to copying the link", async ({ page }) => {
    await stubShare(page, "NotAllowedError", "copied");
    await page.goto("/mouse?status=todos");

    await page.getByRole("button", { name: "Compartilhar" }).click();

    await expect(page.getByRole("button", { name: "Link copiado" })).toBeVisible();
    expect(await copiedTexts(page)).toEqual([page.url()]);
    await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();
  });

  test("a failed share whose copy fails too shows the link to copy by hand", async ({ page }) => {
    await stubShare(page, "NotAllowedError", "NotAllowedError");
    await page.goto("/mouse?status=todos");

    await page.getByRole("button", { name: "Compartilhar" }).click();

    await expect(
      page.getByText("Não deu para copiar. Copie o link selecionado abaixo."),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Link desta página" })).toHaveValue(page.url());
    expect(await copiedTexts(page)).toEqual([page.url()]);
  });
});
