import { expect, test } from "@playwright/test";

test("Apoiar shows the Pix and PayPal key and copies it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  await page.getByRole("banner").getByRole("button", { name: "Apoiar" }).click();
  const donation = page.getByRole("dialog", { name: "Apoiar o Periscópio" });
  await expect(donation.getByRole("textbox", { name: "Chave Pix e PayPal" })).toHaveValue(
    "faustoyuuki@gmail.com",
  );

  await donation.getByRole("button", { name: "Copiar" }).click();
  await expect(donation.getByRole("button", { name: "Copiada" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("faustoyuuki@gmail.com");
});
