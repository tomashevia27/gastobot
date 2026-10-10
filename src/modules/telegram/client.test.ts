import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramApiError, TelegramHttpClient } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("Telegram HTTP boundary", () => {
  it("requests message and callback updates and sends a plain-text confirmation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ ok: true, result: [{ update_id: 18, message: { date: 1791505800, chat: { id: 7, type: "private" }, from: { id: 7 }, text: "/ayuda" } }] }))
      .mockResolvedValueOnce(Response.json({ ok: true, result: { message_id: 19 } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TelegramHttpClient("test-secret");
    expect((await client.getUpdates(18, new AbortController().signal))[0].update_id).toBe(18);
    await client.sendMessage(7, "Gasto guardado");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ offset: 18, timeout: 25, allowed_updates: ["message", "callback_query"] });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ chat_id: 7, text: "Gasto guardado" });
  });

  it("reads callback queries with their data and origin message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
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
    }));
    vi.stubGlobal("fetch", fetchMock);
    const updates = await new TelegramHttpClient("test-secret").getUpdates(undefined, new AbortController().signal);
    const update = updates[0];
    expect(update.callback_query).toMatchObject({
      id: "cb-1", data: "g:ab12cd34:review:confirm", message: { chat: { id: 7, type: "private" } },
    });
    const inaccessible = updates[1];
    expect(inaccessible.callback_query?.message?.date).toBe(0);
  });

  it("sends an inline keyboard as reply markup", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, result: { message_id: 20 } }));
    vi.stubGlobal("fetch", fetchMock);
    const keyboard = [[{ text: "Efectivo", callback_data: "g:ab12cd34:payment:CASH" }]];
    await new TelegramHttpClient("test-secret").sendMessage(7, "¿Cómo pagaste?", keyboard);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      chat_id: 7, text: "¿Cómo pagaste?", reply_markup: { inline_keyboard: keyboard },
    });
  });

  it("answers a callback query with an optional toast text", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ ok: true, result: true }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TelegramHttpClient("test-secret");
    await client.answerCallbackQuery("cb-1");
    await client.answerCallbackQuery("cb-2", "Ese botón ya no corresponde a este registro.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ callback_query_id: "cb-1" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      callback_query_id: "cb-2", text: "Ese botón ya no corresponde a este registro.",
    });
  });

  it("publishes the bot command menu", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ ok: true, result: true }));
    vi.stubGlobal("fetch", fetchMock);
    const commands = [{ command: "registrar_gasto", description: "Registrar un gasto paso a paso" }];
    await new TelegramHttpClient("test-secret").setMyCommands(commands);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ commands });
  });

  it("does not expose the bot token in API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private network details")));
    await expect(new TelegramHttpClient("test-secret").getMe()).rejects.toThrow("Telegram getMe could not be completed.");
  });

  it("exposes a typed API status without exposing the bot token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { ok: false, description: "Bad Request: query is too old" },
      { status: 400 },
    )));
    const request = new TelegramHttpClient("test-secret").answerCallbackQuery("cb-old");
    await expect(request).rejects.toBeInstanceOf(TelegramApiError);
    await expect(request).rejects.toMatchObject({
      method: "answerCallbackQuery",
      status: 400,
      message: "Telegram answerCallbackQuery returned an error.",
    });
  });
});
