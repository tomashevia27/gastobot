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

test("cancels and then confirms permanent deletion", async ({ page, request }) => {
  const merchant = `Eliminar ${randomUUID()}`;
  const created = await request.post("/api/expenses", { data: {
    amount: "12,00", occurredOn: todayInBuenosAires(), paymentMethod: "DEBIT", merchant,
  } });
  expect(created.status()).toBe(201);
  createdIds.push((await created.json()).id);

  await page.goto("/");
  const row = page.getByRole("listitem").filter({ hasText: merchant });
  await row.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(row.getByText("¿Eliminar este gasto definitivamente?")).toBeVisible();
  await row.getByRole("button", { name: "Cancelar eliminación" }).click();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Eliminar", exact: true }).click();
  await row.getByRole("button", { name: "Confirmar eliminación" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gasto eliminado." })).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(merchant)).toHaveCount(0);
});

test("filters a month and category and navigates to the second page", async ({ page, request }) => {
  const prefix = `Filtro ${randomUUID()}`;
  for (let index = 1; index <= 22; index += 1) {
    const response = await request.post("/api/expenses", { data: {
      amount: "1,00", occurredOn: `2034-07-${String(index).padStart(2, "0")}`,
      category: "FOOD", paymentMethod: "CASH", merchant: `${prefix} ${index}`,
    } });
    expect(response.status()).toBe(201);
    createdIds.push((await response.json()).id);
  }

  await page.goto("/");
  await page.getByLabel("Mes", { exact: true }).fill("2034-07");
  await page.getByLabel("Filtrar por categoría").selectOption("FOOD");
  await expect(page.getByText("Página 1")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(20);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("Página 2")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText(`${prefix} 1`, { exact: true })).toBeVisible();
});

test("filters the list and total by an inclusive custom range", async ({ page, request }) => {
  const title = `Rango ${randomUUID()}`;
  const created = await request.post("/api/expenses", { data: {
    amount: "12,34", occurredOn: "2035-09-20", paymentMethod: "CASH", title,
  } });
  expect(created.status()).toBe(201);
  createdIds.push((await created.json()).id);

  await page.goto("/");
  await page.getByLabel("Período").selectOption("custom");
  await page.getByLabel("Desde").fill("2035-09-08");
  await page.getByLabel("Hasta").fill("2035-09-20");
  await page.getByRole("button", { name: "Aplicar fechas" }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByText("$ 12,34").first()).toBeVisible();
  await expect(page.getByText("1 gasto en el rango")).toBeVisible();
});
