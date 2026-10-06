import type { Expense } from "@/generated/prisma/client";
import { prisma } from "@/server/prisma";
import type { ExpenseStore, ExpenseDto } from "../application/types";
import type { ValidatedExpenseInput } from "../domain/validation";

function toDatabaseDate(civilDate: string): Date {
  // Prisma maps a JS Date to PostgreSQL DATE; encode the civil value at UTC midnight.
  return new Date(`${civilDate}T00:00:00.000Z`);
}

function toCivilDate(date: Date): string {
  // DATE has no timezone. Prisma represents it as UTC midnight after reading.
  return date.toISOString().slice(0, 10);
}

function toDto(expense: Expense): ExpenseDto {
  if (expense.amountCents < 1n || expense.amountCents > 99_999_999_999n) {
    throw new Error("Invalid amount stored in expenses.");
  }
  return {
    id: expense.id,
    amountCents: Number(expense.amountCents),
    currency: "ARS",
    occurredOn: toCivilDate(expense.occurredOn),
    category: expense.category,
    paymentMethod: expense.paymentMethod,
    merchant: expense.merchant,
    description: expense.description,
    source: "MANUAL_WEB",
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export const prismaExpenseStore: ExpenseStore = {
  async insert(input: ValidatedExpenseInput) {
    const expense = await prisma.expense.create({
      data: {
        amountCents: BigInt(input.amountCents),
        currency: "ARS",
        occurredOn: toDatabaseDate(input.occurredOn),
        category: input.category,
        paymentMethod: input.paymentMethod,
        merchant: input.merchant,
        description: input.description,
        source: "MANUAL_WEB",
      },
    });
    return toDto(expense);
  },

  async findAll() {
    const expenses = await prisma.expense.findMany({
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    });
    return expenses.map(toDto);
  },

  async sumCents(fromInclusive: string, toExclusive: string) {
    const result = await prisma.expense.aggregate({
      _sum: { amountCents: true },
      where: {
        currency: "ARS",
        occurredOn: {
          gte: toDatabaseDate(fromInclusive),
          lt: toDatabaseDate(toExclusive),
        },
      },
    });
    return (result._sum.amountCents ?? 0n).toString();
  },
};
