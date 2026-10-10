import { describe, expect, it, vi } from "vitest";
import type { ExpenseDto, ExpenseStore } from "@/modules/expenses/application/types";
import type { ValidatedExpenseInput } from "@/modules/expenses/domain/validation";
import { TelegramApiError, type TelegramUpdate } from "./client";
import { DRAFT_TTL_MS, TelegramConversation } from "./conversation";
import { processTelegramUpdate } from "./processor";

const botId = 77;
const chatId = 4242;

function expenseDto(overrides: Partial<ExpenseDto> = {}): ExpenseDto {
  return {
    id: "9f1d5f0e-0000-4000-8000-000000000001",
    amountCents: 850000,
    currency: "ARS",
    occurredOn: "2026-10-08",
    category: "FOOD",
    paymentMethod: "CASH",
    title: null,
    merchant: null,
    description: null,
    source: "TELEGRAM",
    createdAt: "2026-10-08T15:00:00.000Z",
    updatedAt: "2026-10-08T15:00:00.000Z",
    ...overrides,
  };
}

function fakeStore() {
  const telegramInserts: { input: ValidatedExpenseInput; updateId: number }[] = [];
  const store: ExpenseStore = {
    insert: async () => expenseDto(),
    insertFromTelegram: async (input, key) => {
      telegramInserts.push({ input, updateId: key.updateId });
      return { expense: expenseDto({ amountCents: input.amountCents, title: input.title }), created: true };
    },
    findTelegramResult: async () => null,
    update: async () => null,
    delete: async () => false,
    findPage: async () => ({ expenses: [], totalCount: 0 }),
    sumCents: async () => "0",
  };
  return { store, telegramInserts };
}

function clock(initialIso: string) {
  let current = new Date(initialIso);
  return { now: () => current, advance(ms: number) { current = new Date(current.getTime() + ms); } };
}

let nextUpdateId = 9000;

function message(text: string, overrides: Partial<NonNullable<TelegramUpdate["message"]>> = {}): TelegramUpdate {
  nextUpdateId += 1;
  return {
    update_id: nextUpdateId,
    message: {
      date: 1791505800, chat: { id: chatId, type: "private" }, from: { id: chatId }, text, ...overrides,
    },
  };
}

function callback(data: string, overrides: { from?: number; chatType?: string } = {}): TelegramUpdate {
  nextUpdateId += 1;
  return {
    update_id: nextUpdateId,
    callback_query: {
      id: `cb-${nextUpdateId}`,
      from: { id: overrides.from ?? chatId },
      chat_instance: "chat-instance",
      data,
      message: {
        date: 1791505800,
        chat: { id: chatId, type: overrides.chatType ?? "private" },
        from: { id: chatId },
        text: "Revisá el gasto",
      },
    },
  };
}

function setup(options: { now?: () => Date } = {}) {
  const { store, telegramInserts } = fakeStore();
  const sendMessage = vi.fn<(chatId: number, text: string, keyboard?: unknown) => Promise<void>>().mockResolvedValue(undefined);
  const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
  const client = { sendMessage, answerCallbackQuery };
  const conversation = new TelegramConversation({
    createExpense: async (input, updateId) => {
      const result = await store.insertFromTelegram(input as ValidatedExpenseInput, { botId, updateId });
      return result;
    },
    recoverExpense: (updateId) => store.findTelegramResult({ botId, updateId }),
    now: options.now ?? (() => new Date("2026-10-08T15:00:00Z")),
  });
  const run = (update: TelegramUpdate, allowed = chatId) =>
    processTelegramUpdate(update, botId, allowed, client, store, conversation);
  return { store, telegramInserts, sendMessage, answerCallbackQuery, conversation, run };
}

describe("Telegram update dispatch", () => {
  it("starts the guided flow without inserting an expense", async () => {
    const { run, sendMessage, telegramInserts } = setup();

    await run(message("/registrar_gasto"));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][1]).toContain("¿Cuánto gastaste?");
    expect(telegramInserts).toHaveLength(0);

    await run(message("/registrar-gasto"));
    expect(sendMessage.mock.calls[1][1]).toContain("Ya tenés un gasto en curso");
    expect(telegramInserts).toHaveLength(0);
  });

  it("answers free text without a draft and never writes to the store", async () => {
    const { run, sendMessage, telegramInserts } = setup();

    await run(message("hola"));
    expect(sendMessage.mock.calls[0][1]).toContain("/registrar_gasto");
    expect(sendMessage.mock.calls[0][2]).toEqual([[{ text: "Registrar gasto", callback_data: "s:start" }]]);
    expect(telegramInserts).toHaveLength(0);
  });

  it("blocks the quick command while a draft is active and keeps its behaviour otherwise", async () => {
    const { run, sendMessage, telegramInserts } = setup();

    await run(message("/registrar_gasto"));
    await run(message("8500"));
    await run(message("/gasto 10 efectivo"));
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Hay un registro en curso");
    expect(telegramInserts).toHaveLength(0);

    await run(message("/cancelar"));
    await run(message('/gasto 8.500,50 efectivo --categoria comida --titulo "Almuerzo"'));
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Gasto guardado");
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Almuerzo");
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Comida");
    expect(telegramInserts).toHaveLength(1);
  });

  it("keeps the parse errors of the quick command outside a draft", async () => {
    const { run, sendMessage, telegramInserts } = setup();

    await run(message("/gasto 1.23 efectivo"));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][1]).toContain("No se guardó el gasto");
    expect(telegramInserts).toHaveLength(0);
  });

  it("blocks even a malformed quick command while a draft is active", async () => {
    const { run, sendMessage } = setup();

    await run(message("/registrar_gasto"));
    await run(message("8500"));
    await run(message("/gasto 1.23 efectivo"));
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Hay un registro en curso");
  });

  it("routes commands, answers buttons and confirms through the guided flow", async () => {
    const { run, sendMessage, answerCallbackQuery, telegramInserts, conversation } = setup();

    await run(message("/start"));
    expect(sendMessage.mock.calls[0][1]).toContain("GastoBot");
    expect(sendMessage.mock.calls[0][2]).toEqual([[{ text: "Registrar gasto", callback_data: "s:start" }]]);
    await run(callback("s:start"));
    expect(sendMessage.mock.calls[1][1]).toContain("¿Cuánto gastaste?");

    await run(message("8500"));
    const paymentKeyboard = sendMessage.mock.calls.at(-1)![2] as { text: string; callback_data: string }[][];
    const payment = paymentKeyboard.flat().find((button) => button.text === "Efectivo")!;
    await run(callback(payment.callback_data));
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Elegí la categoría.");
    expect(answerCallbackQuery).toHaveBeenCalledWith(`cb-${nextUpdateId}`, undefined);

    await run(callback(payment.callback_data));
    expect(answerCallbackQuery).toHaveBeenLastCalledWith(expect.any(String), expect.stringContaining("ya no corresponde"));
    expect(sendMessage).toHaveBeenCalledTimes(4);
    expect(conversation.hasDraft()).toBe(true);

    await run(message("/ayuda"));
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("/registrar_gasto");

    await run(message("/cancelar"));
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("canceló");
    expect(conversation.hasDraft()).toBe(false);
    expect(telegramInserts).toHaveLength(0);
  });

  it("continues with a visible reply when Telegram rejects an expired callback", async () => {
    const { run, sendMessage, answerCallbackQuery } = setup();
    answerCallbackQuery.mockRejectedValueOnce(new TelegramApiError("answerCallbackQuery", 400));

    await run(message("/registrar_gasto"));
    await run(message("8500"));
    const paymentKeyboard = sendMessage.mock.calls.at(-1)![2] as { text: string; callback_data: string }[][];
    await run(callback(paymentKeyboard.flat()[0].callback_data));
    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Elegí la categoría.");
  });

  it("retries a transient callback failure instead of advancing silently", async () => {
    const { run, sendMessage, answerCallbackQuery } = setup();
    await run(message("/registrar_gasto"));
    await run(message("8500"));
    const paymentKeyboard = sendMessage.mock.calls.at(-1)![2] as { text: string; callback_data: string }[][];
    const incoming = callback(paymentKeyboard.flat()[0].callback_data);
    answerCallbackQuery.mockRejectedValueOnce(new Error("temporary network failure"));

    await expect(run(incoming)).rejects.toThrow("temporary network failure");
    expect(sendMessage).toHaveBeenCalledTimes(2);

    await run(incoming);
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("Elegí la categoría.");
  });

  it("reports the expiry notice before the quick command reply", async () => {
    const time = clock("2026-10-08T15:00:00Z");
    const { run, sendMessage } = setup({ now: time.now });

    await run(message("/registrar_gasto"));
    time.advance(DRAFT_TTL_MS + 1);
    await run(message("/gasto 10 efectivo"));
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[1][1]).toContain("venció");
    expect(sendMessage.mock.calls[1][1]).toContain("Gasto guardado");
  });

  it("keeps the expiry notice pending when sending the reply fails", async () => {
    const time = clock("2026-10-08T15:00:00Z");
    const { run, sendMessage } = setup({ now: time.now });

    await run(message("/registrar_gasto"));
    time.advance(DRAFT_TTL_MS + 1);
    const incoming = message("/ayuda");
    sendMessage.mockRejectedValueOnce(new Error("temporary network failure"));

    await expect(run(incoming)).rejects.toThrow("temporary network failure");
    await run(incoming);
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("venció");
  });

  it("keeps a cancelled draft until Telegram accepts the confirmation", async () => {
    const { run, sendMessage, conversation } = setup();

    await run(message("/registrar_gasto"));
    const incoming = message("/cancelar");
    sendMessage.mockRejectedValueOnce(new Error("temporary network failure"));

    await expect(run(incoming)).rejects.toThrow("temporary network failure");
    expect(conversation.hasDraft()).toBe(true);

    await run(incoming);
    expect(conversation.hasDraft()).toBe(false);
    expect(sendMessage.mock.calls.at(-1)![1]).toContain("canceló");
  });

  it("ignores unauthorized senders, groups and foreign callback users", async () => {
    const { run, sendMessage, answerCallbackQuery, telegramInserts, conversation } = setup();

    await run(message("/registrar_gasto", { from: { id: chatId + 1 } }));
    await run(message("/registrar_gasto", { chat: { id: chatId, type: "group" } }));
    await run(message("/registrar_gasto", { chat: { id: chatId + 9, type: "private" } }));
    await run(callback("s:start", { from: chatId + 1 }));
    expect(sendMessage).not.toHaveBeenCalled();
    expect(answerCallbackQuery).not.toHaveBeenCalled();
    expect(conversation.hasDraft()).toBe(false);

    await run(message("/gasto 10 efectivo", { from: { id: chatId + 1 } }));
    expect(telegramInserts).toHaveLength(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("ignores updates without text or without a callback payload", async () => {
    const { run, sendMessage } = setup();

    await run({ update_id: 12345, message: { date: 1791505800, chat: { id: chatId, type: "private" }, from: { id: chatId } } });
    await run({
      update_id: 12346,
      callback_query: {
        id: "cb-x", from: { id: chatId }, chat_instance: "ci",
        message: { date: 1791505800, chat: { id: chatId, type: "private" }, from: { id: chatId }, text: "hola" },
      },
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
