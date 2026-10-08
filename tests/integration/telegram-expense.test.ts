import { afterAll, describe, expect, it } from "vitest";
import { createTelegramExpense, ExpenseValidationError } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import { prisma } from "@/server/prisma";

const botId = 77889900;
const updateIds: number[] = [];
const expenseIds: string[] = [];
let nextUpdateId = Math.floor(Date.now() / 1000);

function key() {
  const updateId = nextUpdateId++;
  updateIds.push(updateId);
  return { botId, updateId };
}

const input = { amount: "8.500,50", occurredOn: "2026-10-08", category: "FOOD", paymentMethod: "CASH" };

afterAll(async () => {
  if (updateIds.length) await prisma.telegramProcessedUpdate.deleteMany({ where: { botId: BigInt(botId), updateId: { in: updateIds.map(BigInt) } } });
  if (expenseIds.length) await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
  await prisma.$disconnect();
});

describe("Telegram expense persistence", () => {
  it("saves exact cents with Telegram origin and ignores a repeated update after deletion", async () => {
    const update = key();
    const first = await createTelegramExpense(input, update, prismaExpenseStore);
    expect(first.created).toBe(true);
    expect(first.expense).toMatchObject({ amountCents: 850050, occurredOn: "2026-10-08", source: "TELEGRAM" });
    expenseIds.push(first.expense!.id);

    const repeated = await createTelegramExpense(input, update, prismaExpenseStore);
    expect(repeated).toEqual({ expense: first.expense, created: false });
    expect(await prisma.expense.count({ where: { id: first.expense!.id } })).toBe(1);

    await prisma.expense.delete({ where: { id: first.expense!.id } });
    const afterDeletion = await createTelegramExpense(input, update, prismaExpenseStore);
    expect(afterDeletion).toEqual({ expense: null, created: false });
    expect(await prisma.telegramProcessedUpdate.findUniqueOrThrow({ where: { botId_updateId: { botId: BigInt(botId), updateId: BigInt(update.updateId) } } })).toMatchObject({ expenseId: null });
  });

  it("creates only one expense when the same update arrives concurrently", async () => {
    const update = key();
    const results = await Promise.all([
      createTelegramExpense(input, update, prismaExpenseStore),
      createTelegramExpense(input, update, prismaExpenseStore),
    ]);
    const created = results.find((result) => result.created);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results[0].expense?.id).toBe(results[1].expense?.id);
    expenseIds.push(created!.expense!.id);
  });

  it("rejects invalid input without reserving the update id", async () => {
    const update = key();
    await expect(createTelegramExpense({ ...input, amount: "1.23" }, update, prismaExpenseStore)).rejects.toBeInstanceOf(ExpenseValidationError);
    expect(await prisma.telegramProcessedUpdate.findUnique({ where: { botId_updateId: { botId: BigInt(botId), updateId: BigInt(update.updateId) } } })).toBeNull();
  });
});
