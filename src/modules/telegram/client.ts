import { z } from "zod";

const messageSchema = z.object({
  date: z.number().int().positive().safe(),
  chat: z.object({ id: z.number().int().safe(), type: z.string() }),
  from: z.object({ id: z.number().int().positive().safe() }).optional(),
  text: z.string().optional(),
});

const updateSchema = z.object({
  update_id: z.number().int().nonnegative().safe(),
  message: messageSchema.optional(),
});

export type TelegramUpdate = z.infer<typeof updateSchema>;

export interface TelegramClient {
  getMe(): Promise<{ id: number }>;
  getUpdates(offset: number | undefined, signal: AbortSignal): Promise<TelegramUpdate[]>;
  sendMessage(chatId: number, text: string): Promise<void>;
}

export class TelegramHttpClient implements TelegramClient {
  constructor(private readonly token: string) {}

  private async call(method: string, body: object, signal?: AbortSignal): Promise<unknown> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!response.ok) throw new Error(`Telegram ${method} failed with HTTP ${response.status}.`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("ok" in payload) || payload.ok !== true) {
        throw new Error(`Telegram ${method} returned an error.`);
      }
      return payload;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof Error && error.message.startsWith("Telegram ")) throw error;
      throw new Error(`Telegram ${method} could not be completed.`);
    }
  }

  async getMe(): Promise<{ id: number }> {
    const payload = await this.call("getMe", {});
    const parsed = z.object({ result: z.object({ id: z.number().int().positive().safe() }) }).safeParse(payload);
    if (!parsed.success) throw new Error("Telegram getMe returned an invalid response.");
    return parsed.data.result;
  }

  async getUpdates(offset: number | undefined, signal: AbortSignal): Promise<TelegramUpdate[]> {
    const payload = await this.call("getUpdates", {
      ...(offset === undefined ? {} : { offset }), timeout: 25, allowed_updates: ["message"],
    }, signal);
    const parsed = z.object({ result: z.array(updateSchema) }).safeParse(payload);
    if (!parsed.success) throw new Error("Telegram getUpdates returned an invalid response.");
    return parsed.data.result;
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    await this.call("sendMessage", { chat_id: chatId, text });
  }
}
