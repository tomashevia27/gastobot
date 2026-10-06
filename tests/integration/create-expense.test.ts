import { afterAll, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/expenses/route";
import { getExpensesSnapshot } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import { prisma } from "@/server/prisma";

const createdIds: string[] = [];

afterAll(async () => {
  vi.restoreAllMocks();
  if (createdIds.length) {
    await prisma.expense.deleteMany({ where: { id: { in: createdIds } } });
  }
  await prisma.$disconnect();
});

function expenseRequest(body: unknown): Request {
  return new Request("http://localhost/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("manual expense through HTTP and PostgreSQL", () => {
  it("inserts exact cents and a civil date, then reads a safe DTO", async () => {
    const response = await POST(expenseRequest({
      amount: "8.500,50",
      occurredOn: "2026-10-06",
      category: "FOOD",
      paymentMethod: "CASH",
      merchant: "  Kiosco  ",
      description: "  ",
    }));
    expect(response.status).toBe(201);
    const dto = await response.json();
    createdIds.push(dto.id);
    expect(dto).toMatchObject({
      amountCents: 850050,
      currency: "ARS",
      occurredOn: "2026-10-06",
      category: "FOOD",
      paymentMethod: "CASH",
      merchant: "Kiosco",
      description: null,
      source: "MANUAL_WEB",
    });
    expect(Number.isNaN(Date.parse(dto.createdAt))).toBe(false);

    const stored = await prisma.expense.findUniqueOrThrow({ where: { id: dto.id } });
    expect(stored.amountCents).toBe(850050n);
    expect(stored.occurredOn.toISOString()).toBe("2026-10-06T00:00:00.000Z");
    expect(stored.source).toBe("MANUAL_WEB");
    expect((await GET()).status).toBe(200);
  });

  it("rejects invalid and client-controlled fields without inserting", async () => {
    const before = await prisma.expense.count();
    const invalid = await POST(expenseRequest({
      amount: "1,234",
      occurredOn: "2026-02-30",
      paymentMethod: "",
    }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      errors: {
        amount: expect.any(String),
        occurredOn: expect.any(String),
        paymentMethod: expect.any(String),
      },
    });
    const forged = await POST(expenseRequest({
      amount: "10",
      occurredOn: "2026-10-06",
      paymentMethod: "CASH",
      source: "MANUAL_WEB",
    }));
    expect(forged.status).toBe(400);
    expect(await prisma.expense.count()).toBe(before);
  });

  it("sorts by date and totals only the Buenos Aires current month", async () => {
    const septemberBase = await prisma.expense.aggregate({
      _sum: { amountCents: true },
      where: { occurredOn: { gte: new Date("2026-09-01T00:00:00Z"), lt: new Date("2026-10-01T00:00:00Z") } },
    });
    const previous = await POST(expenseRequest({
      amount: "10,25",
      occurredOn: "2026-09-30",
      paymentMethod: "DEBIT",
    }));
    const current = await POST(expenseRequest({
      amount: "20,50",
      occurredOn: "2026-10-01",
      paymentMethod: "CREDIT",
    }));
    expect(previous.status).toBe(201);
    expect(current.status).toBe(201);
    const previousDto = await previous.json();
    const currentDto = await current.json();
    createdIds.push(previousDto.id, currentDto.id);

    const snapshot = await getExpensesSnapshot(prismaExpenseStore, new Date("2026-10-01T00:30:00Z"));
    expect(snapshot.month).toBe("2026-09");
    expect(snapshot.currentMonthTotalCents).toBe(((septemberBase._sum.amountCents ?? 0n) + 1025n).toString());
    const positions = snapshot.expenses.map((expense) => expense.id);
    expect(positions.indexOf(currentDto.id)).toBeLessThan(positions.indexOf(previousDto.id));
  });

  it("keeps the database amount range invariant", async () => {
    await expect(prisma.expense.create({
      data: {
        amountCents: 0n,
        occurredOn: new Date("2026-10-06T00:00:00Z"),
        paymentMethod: "CASH",
      },
    })).rejects.toThrow();
  });

  it("maps a persistence failure to generic HTTP feedback", async () => {
    vi.spyOn(prismaExpenseStore, "insert").mockRejectedValueOnce(new Error("private connection details"));
    const response = await POST(expenseRequest({
      amount: "10",
      occurredOn: "2026-10-06",
      paymentMethod: "CASH",
    }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("No se pudo guardar el gasto. Intentá de nuevo.");
    expect(JSON.stringify(body)).not.toContain("private connection details");
  });
});
