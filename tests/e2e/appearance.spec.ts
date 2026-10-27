import { expect, test, type Page } from "@playwright/test";

const lightPage = "rgb(255, 255, 255)";
const darkPage = "oklch(0.15 0 0)";

async function openAppearance(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: "Aparência" }).click();
  return page.getByRole("dialog", { name: "Aparência" });
}

async function expectTheme(page: Page, theme: "light" | "dark") {
  await expect(page.getByRole("banner")).toHaveCSS(
    "background-color",
    theme === "light" ? lightPage : darkPage,
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    theme === "light" ? "#ffffff" : "#0b0b0b",
  );
}

/** The shortest Produto row: rows with long names grow past the density's height. */
async function shortestRowHeight(page: Page): Promise<number> {
  const rows = page.getByRole("row").filter({ has: page.getByRole("rowheader") });
  const heights = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().height),
  );
  return Math.min(...heights);
}

test("Aparência switches between Claro, Escuro and Sistema, and the choice survives a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expectTheme(page, "light");

  const appearance = await openAppearance(page);
  await expect(appearance).toMatchAriaSnapshot({ name: "appearance-popover.aria.yml" });
  await appearance.getByRole("radio", { name: "Escuro" }).check();
  await expectTheme(page, "dark");

  await page.reload();
  await expectTheme(page, "dark");

  await (await openAppearance(page)).getByRole("radio", { name: "Sistema" }).check();
  await expectTheme(page, "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "dark");
});

test("a stored Claro on a dark system paints light from the first frame", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expectTheme(page, "dark");
  await page.evaluate(() => localStorage.setItem("periscopio:tema", "claro"));

  // Runs at the reload's document creation, before the page's own scripts: records the
  // first frame and every theme the page takes until the test reads them.
  await page.addInitScript(() => {
    const themes: string[] = [];
    const record = () =>
      themes.push(document.documentElement.classList.contains("dark") ? "dark" : "light");
    new MutationObserver(record).observe(document, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
    requestAnimationFrame(() => {
      record();
      Object.assign(window, {
        firstFrame: {
          themes,
          themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
        },
      });
    });
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Periscópio");
  const firstFrame = await page.evaluate(() => Reflect.get(window, "firstFrame"));
  expect(firstFrame).toEqual({ themes: ["light"], themeColor: "#ffffff" });
  await expectTheme(page, "light");
});

test("the Compacta density shortens the table rows and photos, and survives a reload", async ({
  page,
}) => {
  await page.goto("/mouse");
  await expect(page.getByRole("rowheader").first()).toBeVisible();
  const firstPhoto = page.getByRole("rowheader").first().locator("img, [aria-hidden=true]").first();
  expect(await shortestRowHeight(page)).toBe(60);
  await expect(firstPhoto).toHaveCSS("width", "40px");

  const appearance = await openAppearance(page);
  await appearance.getByRole("radio", { name: "Compacta" }).check();
  await expect.poll(() => shortestRowHeight(page)).toBe(48);
  await expect(firstPhoto).toHaveCSS("width", "28px");
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(page.getByRole("rowheader").first()).toBeVisible();
  expect(await shortestRowHeight(page)).toBe(48);

  await (await openAppearance(page)).getByRole("radio", { name: "Confortável" }).check();
  await expect.poll(() => shortestRowHeight(page)).toBe(60);
});

test("with a full storage, both switches still apply for the visit", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = Storage.prototype.removeItem = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/mouse");
  await expect(page.getByRole("rowheader").first()).toBeVisible();

  const appearance = await openAppearance(page);
  await appearance.getByRole("radio", { name: "Escuro" }).check();
  await expectTheme(page, "dark");
  await appearance.getByRole("radio", { name: "Compacta" }).check();
  await expect.poll(() => shortestRowHeight(page)).toBe(48);
  await expect(appearance.getByRole("radio", { name: "Escuro" })).toBeChecked();

  await appearance.getByRole("radio", { name: "Sistema" }).check();
  await expectTheme(page, "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "dark");
});
