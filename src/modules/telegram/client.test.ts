import { describe, expect, it, vi } from "vitest";
import { TelegramApiError, TelegramHttpClient, TelegramTransportError } from "./client";

describe("Telegram HTTP boundary", () => {
  it("requests message and callback updates and sends a plain-text confirmation", async () => {
    const transport = vi.fn()
      .mockResolvedValueOnce({ status: 200, payload: { ok: true, result: [
        { update_id: 18, message: { date: 1791505800, chat: { id: 7, type: "private" }, from: { id: 7 }, text: "/ayuda" } },
      ] } })
      .mockResolvedValueOnce({ status: 200, payload: { ok: true, result: { message_id: 19 } } });
    const client = new TelegramHttpClient("test-secret", transport);
    const signal = new AbortController().signal;
    expect((await client.getUpdates(18, signal))[0].update_id).toBe(18);
    await client.sendMessage(7, "Gasto guardado");

    expect(transport.mock.calls[0]).toEqual([
      "test-secret", "getUpdates", { offset: 18, timeout: 25, allowed_updates: ["message", "callback_query"] }, signal,
    ]);
    expect(transport.mock.calls[1]).toEqual([
      "test-secret", "sendMessage", { chat_id: 7, text: "Gasto guardado" }, undefined,
    ]);
  });

  it("reads callback queries with their data and origin message", async () => {
    const transport = vi.fn().mockResolvedValue({ status: 200, payload: {
      ok: true,
      result: [{
        update_id: 19,
        callback_query: {
          id: "cb-1",
          from: { id: 7 },
          chat_instance: "ci",
          data: "g:ab12cd34:review:confirm",
          message: { date: 1791505800, chat: { id: 7, type: "private" }, from: { id: 7 }, text: "Revisá el gasto" },
        },
      }, {
        update_id: 20,
        callback_query: {
          id: "cb-2",
          from: { id: 7 },
          chat_instance: "ci",
          data: "g:ab12cd34:review:confirm",
          message: { date: 0, message_id: 99, chat: { id: 7, type: "private" } },
        },
      }],
    } });
    const updates = await new TelegramHttpClient("test-secret", transport).getUpdates(undefined, new AbortController().signal);
    expect(updates[0].callback_query).toMatchObject({
      id: "cb-1", data: "g:ab12cd34:review:confirm", message: { chat: { id: 7, type: "private" } },
    });
    expect(updates[1].callback_query?.message?.date).toBe(0);
  });

  it("sends an inline keyboard as reply markup", async () => {
    const transport = vi.fn().mockResolvedValue({ status: 200, payload: { ok: true, result: { message_id: 20 } } });
    const keyboard = [[{ text: "Efectivo", callback_data: "g:ab12cd34:payment:CASH" }]];
    await new TelegramHttpClient("test-secret", transport).sendMessage(7, "¿Cómo pagaste?", keyboard);
    expect(transport.mock.calls[0][2]).toEqual({
      chat_id: 7, text: "¿Cómo pagaste?", reply_markup: { inline_keyboard: keyboard },
    });
  });

  it("answers a callback query with an optional toast text", async () => {
    const transport = vi.fn().mockResolvedValue({ status: 200, payload: { ok: true, result: true } });
    const client = new TelegramHttpClient("test-secret", transport);
    await client.answerCallbackQuery("cb-1");
    await client.answerCallbackQuery("cb-2", "Ese botón ya no corresponde a este registro.");
    expect(transport.mock.calls[0][2]).toEqual({ callback_query_id: "cb-1" });
    expect(transport.mock.calls[1][2]).toEqual({
      callback_query_id: "cb-2", text: "Ese botón ya no corresponde a este registro.",
    });
  });

  it("publishes the bot command menu", async () => {
    const transport = vi.fn().mockResolvedValue({ status: 200, payload: { ok: true, result: true } });
    const commands = [{ command: "registrar_gasto", description: "Registrar un gasto paso a paso" }];
    await new TelegramHttpClient("test-secret", transport).setMyCommands(commands);
    expect(transport.mock.calls[0][2]).toEqual({ commands });
  });

  it("does not expose the bot token in transport errors", async () => {
    const transport = vi.fn().mockRejectedValue(Object.assign(new Error("private network details"), { code: "ETIMEDOUT" }));
    await expect(new TelegramHttpClient("test-secret", transport).getMe()).rejects.toMatchObject({
      method: "getMe",
      code: "ETIMEDOUT",
      message: "Telegram getMe could not be completed.",
    } satisfies Partial<TelegramTransportError>);
  });

  it("exposes a typed API status without exposing the bot token", async () => {
    const transport = vi.fn().mockResolvedValue({ status: 400, payload: {
      ok: false, description: "Bad Request: query is too old",
    } });
    const request = new TelegramHttpClient("test-secret", transport).answerCallbackQuery("cb-old");
    await expect(request).rejects.toBeInstanceOf(TelegramApiError);
    await expect(request).rejects.toMatchObject({
      method: "answerCallbackQuery",
      status: 400,
      message: "Telegram answerCallbackQuery returned an error.",
    });
  });
});
