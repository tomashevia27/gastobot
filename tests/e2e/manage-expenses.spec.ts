import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { todayInBuenosAires } from "../../src/modules/expenses/domain/dates";

const createdIds: string[] = [];

test.afterEach(async () => {
  if (!createdIds.length) return;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("DELETE FROM expenses WHERE id = ANY($1::uuid[])", [createdIds]);
  } finally {
    createdIds.length = 0;
    await client.end();
  }
});

test("edits an expense and keeps the new values after reload", async ({ page, request }) => {
  const merchant = `Editar ${randomUUID()}`;
  const created = await request.post("/api/expenses", { data: {
    amount: "10,00", occurredOn: todayInBuenosAires(), category: "FOOD",
    paymentMethod: "CASH", merchant,
  } });
  expect(created.status()).toBe(201);
  createdIds.push((await created.json()).id);

  await page.goto("/");
  const row = page.getByRole("listitem").filter({ hasText: merchant });
  await row.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar gasto" })).toBeVisible();
  await expect(page.getByLabel("Monto en ARS")).toHaveValue("10,00");
  await page.getByLabel("Monto en ARS").fill("25,50");
  await page.getByLabel("Categoría", { exact: true }).selectOption("HEALTH");
  await page.getByLabel("Comercio").fill(`${merchant} nuevo`);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gasto actualizado." })).toBeVisible();

  await page.reload();
  const updated = page.getByRole("listitem").filter({ hasText: `${merchant} nuevo` });
  await expect(updated).toContainText("$ 25,50");
  await expect(updated).toContainText("Salud");
});

test("keeps the edit form and saved record after a failed update", async ({ page, request }) => {
  const merchant = `Error edición ${randomUUID()}`;
  const created = await request.post("/api/expenses", { data: {
    amount: "10,00", occurredOn: todayInBuenosAires(), paymentMethod: "CASH", merchant,
  } });
  expect(created.status()).toBe(201);
  createdIds.push((await created.json()).id);

  await page.route("**/api/expenses/*", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 500, contentType: "application/json",
        body: JSON.stringify({ error: "No se pudo actualizar el gasto. Intentá de nuevo." }),
      });
    } else {
      await route.continue();
    }
  });
  await page.goto("/");
  const row = page.getByRole("listitem").filter({ hasText: merchant });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Monto en ARS").fill("25,50");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo actualizar" })).toBeVisible();
  await expect(page.getByLabel("Monto en ARS")).toHaveValue("25,50");
  await expect(row).toContainText("$ 10,00");
});
