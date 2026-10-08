import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramHttpClient } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("Telegram HTTP boundary", () => {
  it("requests only message updates and sends a plain-text confirmation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ ok: true, result: [{ update_id: 18, message: { date: 1791505800, chat: { id: 7, type: "private" }, from: { id: 7 }, text: "/ayuda" } }] }))
      .mockResolvedValueOnce(Response.json({ ok: true, result: { message_id: 19 } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TelegramHttpClient("test-secret");
    expect((await client.getUpdates(18, new AbortController().signal))[0].update_id).toBe(18);
    await client.sendMessage(7, "Gasto guardado");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ offset: 18, timeout: 25, allowed_updates: ["message"] });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ chat_id: 7, text: "Gasto guardado" });
  });

  it("does not expose the bot token in API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private network details")));
    await expect(new TelegramHttpClient("test-secret").getMe()).rejects.toThrow("Telegram getMe could not be completed.");
  });
});
