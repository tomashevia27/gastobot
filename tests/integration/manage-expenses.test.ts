import { afterAll, describe, expect, it } from "vitest";
import { PUT } from "@/app/api/expenses/[id]/route";
import { POST } from "@/app/api/expenses/route";
import { getExpensesSnapshot } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import { prisma } from "@/server/prisma";

const ids: string[] = [];
const input = { amount: "10,00", occurredOn: "2032-04-10", category: "FOOD", paymentMethod: "CASH", merchant: "Manage test" };

async function create() {
  const response = await POST(new Request("http://localhost/api/expenses", {
    method: "POST", body: JSON.stringify(input),
  }));
  expect(response.status).toBe(201);
  const dto = await response.json();
  ids.push(dto.id);
  return dto;
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

afterAll(async () => {
  await prisma.expense.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe("expense editing and deletion", () => {
  it("replaces editable fields, retains server fields and updates the monthly total", async () => {
    const original = await create();
    const before = await getExpensesSnapshot(prismaExpenseStore, new Date("2032-04-15T12:00:00Z"));
    const response = await PUT(new Request(`http://localhost/api/expenses/${original.id}`, {
      method: "PUT",
      body: JSON.stringify({
        amount: "25,50", occurredOn: "2032-05-01", category: "HEALTH",
        paymentMethod: "DEBIT", merchant: " Updated ", description: " Receipt ",
      }),
    }), routeContext(original.id));
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated).toMatchObject({
      id: original.id, amountCents: 2550, occurredOn: "2032-05-01", category: "HEALTH",
      paymentMethod: "DEBIT", merchant: "Updated", description: "Receipt",
      source: original.source, createdAt: original.createdAt,
    });
    const stored = await prisma.expense.findUniqueOrThrow({ where: { id: original.id } });
    expect(stored.amountCents).toBe(2550n);
    expect(stored.occurredOn.toISOString()).toBe("2032-05-01T00:00:00.000Z");
    const after = await getExpensesSnapshot(prismaExpenseStore, new Date("2032-04-15T12:00:00Z"));
    expect(BigInt(after.currentMonthTotalCents)).toBe(BigInt(before.currentMonthTotalCents) - 1000n);
  });

  it("rejects invalid or server-controlled edits without changing the record", async () => {
    const original = await create();
    const response = await PUT(new Request(`http://localhost/api/expenses/${original.id}`, {
      method: "PUT", body: JSON.stringify({ ...input, amount: "1.23", source: "MANUAL_WEB" }),
    }), routeContext(original.id));
    expect(response.status).toBe(400);
    expect(await prisma.expense.findUniqueOrThrow({ where: { id: original.id } })).toMatchObject({ amountCents: 1000n });
  });

  it("returns 404 for missing or malformed ids", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    for (const id of [missing, "invalid-id"]) {
      expect((await PUT(new Request(`http://localhost/api/expenses/${id}`, {
        method: "PUT", body: JSON.stringify(input),
      }), routeContext(id))).status).toBe(404);
    }
  });

});
