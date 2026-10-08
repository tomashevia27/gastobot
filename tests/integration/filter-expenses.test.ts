import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/expenses/route";
import { prisma } from "@/server/prisma";

const ids: string[] = [];

afterAll(async () => {
  await prisma.expense.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe("filtered expense list", () => {
  it("combines month and category, preserves order and pages 20 at a time", async () => {
    for (let index = 0; index < 22; index += 1) {
      const expense = await prisma.expense.create({ data: {
        amountCents: BigInt(index + 1),
        occurredOn: new Date(`2031-05-${String(index + 1).padStart(2, "0")}T00:00:00Z`),
        category: "FOOD", paymentMethod: "CASH", merchant: `Filter test ${index}`,
      } });
      ids.push(expense.id);
    }
    const other = await prisma.expense.create({ data: {
      amountCents: 500n, occurredOn: new Date("2031-05-23T00:00:00Z"),
      category: "HEALTH", paymentMethod: "CASH", merchant: "Other category",
    } });
    ids.push(other.id);

    const firstResponse = await GET(new Request("http://localhost/api/expenses?month=2031-05&category=FOOD"));
    expect(firstResponse.status).toBe(200);
    const first = await firstResponse.json();
    expect(first).toMatchObject({ page: 1, totalCount: 22, hasMore: true });
    expect(first.expenses).toHaveLength(20);
    expect(first.expenses[0].occurredOn).toBe("2031-05-22");
    expect(first.expenses.every((expense: { category: string }) => expense.category === "FOOD")).toBe(true);

    const secondResponse = await GET(new Request("http://localhost/api/expenses?month=2031-05&category=FOOD&page=2"));
    const second = await secondResponse.json();
    expect(second).toMatchObject({ page: 2, totalCount: 22, hasMore: false });
    expect(second.expenses.map((expense: { occurredOn: string }) => expense.occurredOn))
      .toEqual(["2031-05-02", "2031-05-01"]);
  });

  it("returns field errors for invalid query parameters", async () => {
    const response = await GET(new Request("http://localhost/api/expenses?month=2031-13&unexpected=1"));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("errors");
  });
});
