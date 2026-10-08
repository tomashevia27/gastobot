import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/prisma";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import type { TelegramClient, TelegramUpdate } from "@/modules/telegram/client";
import { processTelegramUpdate } from "@/modules/telegram/processor";
import { runTelegramPoller } from "@/modules/telegram/poller";

const botId = 559911;
const userId = 118822;
const updateIds: number[] = [];
const expenseIds: string[] = [];
let nextUpdateId = Math.floor(Date.now() / 1000) + 10000;

function update(text: string): TelegramUpdate {
  const updateId = nextUpdateId++;
  updateIds.push(updateId);
  return {
    update_id: updateId,
    message: { date: 1791505800, chat: { id: userId, type: "private" }, from: { id: userId }, text },
  };
}

afterAll(async () => {
  if (updateIds.length) await prisma.telegramProcessedUpdate.deleteMany({ where: { botId: BigInt(botId), updateId: { in: updateIds.map(BigInt) } } });
  if (expenseIds.length) await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
  await prisma.$disconnect();
});

describe("Telegram message flow", () => {
  it("confirms a saved expense and assigns the message's local date", async () => {
    const incoming = update("/gasto 8.500,50 efectivo --categoria comida");
    const sendMessage = vi.fn<(chatId: number, text: string) => Promise<void>>().mockResolvedValue(undefined);
    await processTelegramUpdate(incoming, botId, userId, { sendMessage }, prismaExpenseStore);
    const processed = await prisma.telegramProcessedUpdate.findUniqueOrThrow({
      where: { botId_updateId: { botId: BigInt(botId), updateId: BigInt(incoming.update_id) } },
      include: { expense: true },
    });
    expenseIds.push(processed.expenseId!);
    expect(processed.expense).toMatchObject({ amountCents: 850050n, source: "TELEGRAM" });
    expect(sendMessage).toHaveBeenCalledWith(userId, expect.stringContaining("Gasto guardado"));
    expect(sendMessage.mock.calls[0][1]).toContain("2026-10-08");
  });

  it("rejects invalid commands and ignores unauthorized users and groups", async () => {
    const invalid = update("/gasto 1.23 efectivo");
    const unauthorized = update("/gasto 10 efectivo");
    unauthorized.message!.from!.id = userId + 1;
    const group = update("/gasto 10 efectivo");
    group.message!.chat.type = "group";
    const sendMessage = vi.fn<(chatId: number, text: string) => Promise<void>>().mockResolvedValue(undefined);
    const before = await prisma.expense.count();
    await processTelegramUpdate(invalid, botId, userId, { sendMessage }, prismaExpenseStore);
    await processTelegramUpdate(unauthorized, botId, userId, { sendMessage }, prismaExpenseStore);
    await processTelegramUpdate(group, botId, userId, { sendMessage }, prismaExpenseStore);
    expect(await prisma.expense.count()).toBe(before);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][1]).toContain("No se guardó el gasto");
  });

  it("retries a failed confirmation without duplicating the expense or advancing the offset early", async () => {
    const incoming = update("/gasto 10 efectivo");
    const offsets: Array<number | undefined> = [];
    const controller = new AbortController();
    let sendAttempts = 0;
    const client: TelegramClient = {
      getMe: async () => ({ id: botId }),
      getUpdates: async (offset) => {
        offsets.push(offset);
        if (offset === incoming.update_id + 1) {
          controller.abort();
          return [];
        }
        return [incoming];
      },
      sendMessage: async () => {
        sendAttempts += 1;
        if (sendAttempts === 1) throw new Error("temporary network failure");
      },
    };

    const previousError = console.error;
    console.error = vi.fn();
    try {
      await runTelegramPoller(client, userId, prismaExpenseStore, controller.signal);
    } finally {
      console.error = previousError;
    }
    expect(offsets).toEqual([undefined, undefined, incoming.update_id + 1]);
    expect(sendAttempts).toBe(2);
    const processed = await prisma.telegramProcessedUpdate.findUniqueOrThrow({
      where: { botId_updateId: { botId: BigInt(botId), updateId: BigInt(incoming.update_id) } },
    });
    expenseIds.push(processed.expenseId!);
    expect(await prisma.expense.count({ where: { id: processed.expenseId! } })).toBe(1);
  });
});
