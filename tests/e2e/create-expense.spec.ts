import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { formatArsCents } from "../../src/modules/expenses/domain/money";

const merchant = `Prueba navegador ${Date.now()}`;

test.afterEach(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("DELETE FROM expenses WHERE merchant = $1", [merchant]);
  } finally {
    await client.end();
  }
});

test("creates an expense, updates the month total and survives a reload", async ({ page, request }) => {
  const before = await request.get("/api/expenses");
  expect(before.ok()).toBe(true);
  const previousTotal = BigInt((await before.json()).currentMonthTotalCents);

  await page.goto("/");
  await page.getByLabel("Monto en ARS").fill("12,34");
  await page.getByLabel("Medio de pago").selectOption("CASH");
  await page.getByLabel("Comercio").fill(merchant);
  await page.getByRole("button", { name: "Guardar gasto" }).click();

  await expect(page.getByRole("status")).toHaveText("Gasto guardado.");
  await expect(page.getByText(merchant)).toBeVisible();
  await expect(page.getByText(formatArsCents((previousTotal + 1234n).toString())).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText(merchant)).toBeVisible();
  await expect(page.getByText(formatArsCents((previousTotal + 1234n).toString())).first()).toBeVisible();
});

test("keeps form values and shows no saved expense after a server error", async ({ page }) => {
  await page.route("**/api/expenses", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "No se pudo guardar el gasto. Intentá de nuevo." }),
      });
    } else {
      await route.continue();
    }
  });
  await page.goto("/");
  await page.getByLabel("Monto en ARS").fill("12,34");
  await page.getByLabel("Medio de pago").selectOption("CASH");
  await page.getByLabel("Comercio").fill(merchant);
  await page.getByRole("button", { name: "Guardar gasto" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "No se pudo guardar el gasto." }))
    .toHaveText("No se pudo guardar el gasto. Intentá de nuevo.");
  await expect(page.getByLabel("Monto en ARS")).toHaveValue("12,34");
  await expect(page.getByLabel("Comercio")).toHaveValue(merchant);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByText(merchant, { exact: true })).toHaveCount(0);
});
