import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/prisma";
import { createTelegramExpense, findTelegramExpenseResult } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import type { InlineKeyboard, TelegramUpdate } from "@/modules/telegram/client";
import { TelegramConversation } from "@/modules/telegram/conversation";
import { processTelegramUpdate } from "@/modules/telegram/processor";

const botId = 334455;
const userId = 119933;
const FIXED_NOW = () => new Date("2026-10-08T15:00:00Z");
let nextUpdateId = Math.floor(Date.now() / 1000) + 50000;
const expenseIds: string[] = [];

function message(text: string): TelegramUpdate {
  nextUpdateId += 1;
  return {
    update_id: nextUpdateId,
    message: { date: 1791505800, chat: { id: userId, type: "private" }, from: { id: userId }, text },
  };
}

function callbackUpdate(data: string): TelegramUpdate {
  nextUpdateId += 1;
  return {
    update_id: nextUpdateId,
    callback_query: {
      id: `cb-${nextUpdateId}`, from: { id: userId }, chat_instance: "ci", data,
      message: { date: 1791505800, chat: { id: userId, type: "private" }, from: { id: userId }, text: "Revisá el gasto" },
    },
  };
}

function harness() {
  const sent: { text: string; keyboard?: InlineKeyboard; countAtSuccess: number | null }[] = [];
  let failSuccess = false;
  let countAtSuccess: number | null = null;
  const sendMessage = vi.fn(async (_chatId: number, text: string, keyboard?: InlineKeyboard) => {
    if (text.includes("✅")) {
      countAtSuccess = await prisma.expense.count();
      if (failSuccess) throw new Error("temporary network failure");
    }
    sent.push({ text, keyboard, countAtSuccess });
  });
  const answerCallbackQuery = vi.fn(async () => {});
  const client = { sendMessage, answerCallbackQuery };
  const conversation = new TelegramConversation({
    createExpense: (input, updateId) => createTelegramExpense(input, { botId, updateId }, prismaExpenseStore),
    recoverExpense: (updateId) => findTelegramExpenseResult({ botId, updateId }, prismaExpenseStore),
    now: FIXED_NOW,
  });
  const run = (update: TelegramUpdate) =>
    processTelegramUpdate(update, botId, userId, client, prismaExpenseStore, conversation);
  const lastKeyboard = () => sent[sent.length - 1]?.keyboard;
  const press = async (label: string) => {
    const button = lastKeyboard()?.flat().find((candidate) => candidate.text === label);
    if (!button) throw new Error(`No button ${label} in ${JSON.stringify(lastKeyboard())}`);
    const update = callbackUpdate(button.callback_data);
    await run(update);
    return update;
  };
  const dataFor = (label: string) => {
    const button = lastKeyboard()?.flat().find((candidate) => candidate.text === label);
    if (!button) throw new Error(`No button ${label} in ${JSON.stringify(lastKeyboard())}`);
    return button.callback_data;
  };

  return { sent, conversation, run, press, dataFor, lastKeyboard, setFailSuccess(value: boolean) { failSuccess = value; } };
}

async function driveToReview(steps: ReturnType<typeof harness>) {
  await steps.run(message("/registrar_gasto"));
  await steps.run(message("8.500,50"));
  await steps.press("Mercado Pago");
  await steps.press("Comida");
  await steps.press("Hoy");
  await steps.run(message("Kiosco Norte"));
  await steps.press("Omitir");
  expect(steps.sent[steps.sent.length - 1].text).toContain("Revisá el gasto");
}

afterAll(async () => {
  await prisma.telegramProcessedUpdate.deleteMany({ where: { botId: BigInt(botId) } });
  if (expenseIds.length) await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
  await prisma.$disconnect();
});

describe("Guided Telegram expense persistence", () => {
  it("keeps the draft out of the database and saves the exact expense after confirmation", async () => {
    const steps = harness();
    const before = await prisma.expense.count();

    await driveToReview(steps);
    expect(await prisma.expense.count()).toBe(before);

    const confirmUpdate = await steps.press("Confirmar");

    expect(await prisma.expense.count()).toBe(before + 1);
    const saved = await prisma.telegramProcessedUpdate.findUniqueOrThrow({
      where: { botId_updateId: { botId: BigInt(botId), updateId: BigInt(confirmUpdate.update_id) } },
      include: { expense: true },
    });
    expect(saved.expenseId).not.toBeNull();
    expenseIds.push(saved.expenseId!);
    expect(saved.expense).toMatchObject({
      amountCents: 850050n,
      currency: "ARS",
      category: "FOOD",
      paymentMethod: "MERCADO_PAGO",
      merchant: "Kiosco Norte",
      description: null,
      source: "TELEGRAM",
    });
    expect(saved.expense!.occurredOn.toISOString().slice(0, 10)).toBe("2026-10-08");

    const success = steps.sent.find((entry) => entry.text.includes("✅"));
    expect(success).toBeDefined();
    expect(success!.text).toContain("Monto: ");
    expect(success!.text).toContain("Medio: Mercado Pago");
    expect(success!.text).toContain("Comercio: Kiosco Norte");
    expect(success!.text).toContain("Descripción: —");
    expect(success!.keyboard?.flat().map((button) => button.text)).toEqual(["Registrar otro gasto"]);
    expect(success!.countAtSuccess).toBe(before + 1);

    await steps.run(message("/registrar_gasto"));
    expect(steps.conversation.hasDraft()).toBe(true);
  });

  it("recovers the confirmation after a process restart without duplicating the expense", async () => {
    const steps = harness();
    const before = await prisma.expense.count();
    await driveToReview(steps);

    const confirmUpdate = callbackUpdate(steps.dataFor("Confirmar"));
    steps.setFailSuccess(true);
    await expect(steps.run(confirmUpdate)).rejects.toThrow("temporary network failure");
    expect(steps.conversation.hasDraft()).toBe(true);
    expect(await prisma.expense.count()).toBe(before + 1);

    const restarted = harness();
    await restarted.run(confirmUpdate);

    expect(await prisma.expense.count()).toBe(before + 1);
    expect(restarted.sent[restarted.sent.length - 1].text).toContain("✅ Gasto registrado");
    expect(restarted.sent[restarted.sent.length - 1].keyboard?.flat().map((button) => button.text))
      .toEqual(["Registrar otro gasto"]);
    const processed = await prisma.telegramProcessedUpdate.findUniqueOrThrow({
      where: { botId_updateId: { botId: BigInt(botId), updateId: BigInt(confirmUpdate.update_id) } },
      include: { expense: true },
    });
    expenseIds.push(processed.expenseId!);
    expect(await prisma.expense.count({ where: { id: processed.expenseId! } })).toBe(1);
    expect(restarted.conversation.hasDraft()).toBe(false);
  });

  it("discards a cancelled draft without writing to the database", async () => {
    const steps = harness();
    const before = await prisma.expense.count();
    const beforeProcessed = await prisma.telegramProcessedUpdate.count({ where: { botId: BigInt(botId) } });
    await driveToReview(steps);

    await steps.press("Cancelar");
    expect(steps.sent[steps.sent.length - 1].text).toContain("canceló");
    expect(steps.conversation.hasDraft()).toBe(false);
    expect(await prisma.expense.count()).toBe(before);
    expect(await prisma.telegramProcessedUpdate.count({ where: { botId: BigInt(botId) } })).toBe(beforeProcessed);
  });
});
