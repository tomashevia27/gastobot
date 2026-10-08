import type { Expense } from "@/generated/prisma/client";
import { prisma } from "@/server/prisma";
import type { ExpenseStore, ExpenseDto, ExpenseSource } from "../application/types";
import type { ValidatedExpenseInput } from "../domain/validation";
import { EXPENSE_PAGE_SIZE, type ExpenseListQuery } from "../domain/list-query";
import { isValidCivilDate } from "../domain/dates";

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
    source: expense.source,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

function toCreateData(input: ValidatedExpenseInput, source: ExpenseSource) {
  return {
    amountCents: BigInt(input.amountCents), currency: "ARS" as const,
    occurredOn: toDatabaseDate(input.occurredOn), category: input.category,
    paymentMethod: input.paymentMethod, merchant: input.merchant,
    description: input.description, source,
  };
}

export const prismaExpenseStore: ExpenseStore = {
  async insert(input: ValidatedExpenseInput, source: ExpenseSource) {
    const expense = await prisma.expense.create({
      data: toCreateData(input, source),
    });
    return toDto(expense);
  },

  async insertFromTelegram(input, key) {
    try {
      const expense = await prisma.$transaction(async (tx) => {
        await tx.telegramProcessedUpdate.create({
          data: { botId: BigInt(key.botId), updateId: BigInt(key.updateId) },
        });
        const created = await tx.expense.create({ data: toCreateData(input, "TELEGRAM") });
        await tx.telegramProcessedUpdate.update({
          where: { botId_updateId: { botId: BigInt(key.botId), updateId: BigInt(key.updateId) } },
          data: { expenseId: created.id },
        });
        return created;
      });
      return { expense: toDto(expense), created: true };
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
      const processed = await prisma.telegramProcessedUpdate.findUnique({
        where: { botId_updateId: { botId: BigInt(key.botId), updateId: BigInt(key.updateId) } },
        include: { expense: true },
      });
      if (!processed) throw error;
      return { expense: processed.expense ? toDto(processed.expense) : null, created: false };
    }
  },

  async update(id: string, input: ValidatedExpenseInput) {
    const result = await prisma.expense.updateMany({
      where: { id },
      data: {
        amountCents: BigInt(input.amountCents), occurredOn: toDatabaseDate(input.occurredOn),
        category: input.category, paymentMethod: input.paymentMethod,
        merchant: input.merchant, description: input.description,
      },
    });
    if (result.count === 0) return null;
    return toDto(await prisma.expense.findUniqueOrThrow({ where: { id } }));
  },

  async delete(id: string) {
    const result = await prisma.expense.deleteMany({ where: { id } });
    return result.count > 0;
  },

  async findPage(query: ExpenseListQuery) {
    let occurredOn;
    if (query.month) {
      let lastDay = 31;
      while (!isValidCivilDate(`${query.month}-${String(lastDay).padStart(2, "0")}`)) lastDay -= 1;
      occurredOn = {
        gte: toDatabaseDate(`${query.month}-01`),
        lte: toDatabaseDate(`${query.month}-${String(lastDay).padStart(2, "0")}`),
      };
    }
    const where = { ...(occurredOn ? { occurredOn } : {}), ...(query.category ? { category: query.category } : {}) };
    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: (query.page - 1) * EXPENSE_PAGE_SIZE,
        take: EXPENSE_PAGE_SIZE,
        orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      }),
      prisma.expense.count({ where }),
    ]);
    return { expenses: expenses.map(toDto), totalCount };
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
