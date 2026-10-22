import { expect, test, type Page } from "@playwright/test";

/**
 * A phone with Web Share gets "Compartilhar" in place of "Copiar link".
 * Chromium has no share sheet to drive, so each test stubs `navigator.share`
 * before the app loads; a touch context makes `(pointer: coarse)` match.
 */

type ShareOutcome = "shared" | "AbortError" | "NotAllowedError";

declare global {
  interface Window {
    sharedData: ShareData[];
    copiedTexts: string[];
  }
}

test.use({ hasTouch: true });

async function stubShare(page: Page, outcome: ShareOutcome) {
  await page.addInitScript((stubOutcome: ShareOutcome) => {
    window.sharedData = [];
    window.copiedTexts = [];
    Object.defineProperty(navigator, "canShare", { value: () => true });
    Object.defineProperty(navigator, "share", {
      value: async (data: ShareData) => {
        window.sharedData.push(data);
        if (stubOutcome !== "shared") throw new DOMException("Share failed", stubOutcome);
      },
    });
    // Clipboard writes fail, so a fallback to the copy flow shows its popover.
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          window.copiedTexts.push(text);
          throw new DOMException("Write denied", "NotAllowedError");
        },
      },
    });
  }, outcome);
}

function sharedData(page: Page) {
  return page.evaluate(() => window.sharedData);
}

test("Compartilhar sends the title and the link with the current search", async ({ page }) => {
  await stubShare(page, "shared");
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
  await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();
});

test("closing the share sheet shows nothing and copies nothing", async ({ page }) => {
  await stubShare(page, "AbortError");
  await page.goto("/mouse");

  await page.getByRole("button", { name: "Compartilhar" }).click();

  await expect.poll(() => sharedData(page)).toHaveLength(1);
  expect(await page.evaluate(() => window.copiedTexts)).toEqual([]);
  await expect(page.getByRole("textbox", { name: "Link desta página" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();
});

test("a failed share falls back to copying, down to the link to copy by hand", async ({ page }) => {
  await stubShare(page, "NotAllowedError");
  await page.goto("/mouse?status=todos");

  await page.getByRole("button", { name: "Compartilhar" }).click();

  await expect(
    page.getByText("Não deu para copiar. Copie o link selecionado abaixo."),
  ).toBeVisible();
  const linkInput = page.getByRole("textbox", { name: "Link desta página" });
  await expect(linkInput).toHaveValue(page.url());
  expect(await page.evaluate(() => window.copiedTexts)).toEqual([page.url()]);
});
