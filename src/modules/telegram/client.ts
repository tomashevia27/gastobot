import { z } from "zod";

const chatSchema = z.object({ id: z.number().int().safe(), type: z.string() });

const messageSchema = z.object({
  date: z.number().int().positive().safe(),
  chat: chatSchema,
  from: z.object({ id: z.number().int().positive().safe() }).optional(),
  text: z.string().optional(),
});

const inaccessibleMessageSchema = z.object({
  date: z.literal(0),
  chat: chatSchema,
  message_id: z.number().int(),
});

const callbackQuerySchema = z.object({
  id: z.string().min(1),
  from: z.object({ id: z.number().int().positive().safe() }),
  chat_instance: z.string(),
  data: z.string().optional(),
  message: z.union([messageSchema, inaccessibleMessageSchema]).optional(),
});

const updateSchema = z.object({
  update_id: z.number().int().nonnegative().safe(),
  message: messageSchema.optional(),
  callback_query: callbackQuerySchema.optional(),
});

export type TelegramUpdate = z.infer<typeof updateSchema>;

export type InlineKeyboardButton = { text: string; callback_data: string };
export type InlineKeyboard = InlineKeyboardButton[][];
export type TelegramBotCommand = { command: string; description: string };

export class TelegramApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly status: number,
  ) {
    super(`Telegram ${method} returned an error.`);
  }
}

export interface TelegramClient {
  getMe(): Promise<{ id: number }>;
  getUpdates(offset: number | undefined, signal: AbortSignal): Promise<TelegramUpdate[]>;
  sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void>;
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>;
  setMyCommands(commands: TelegramBotCommand[]): Promise<void>;
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
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || !("ok" in payload) || payload.ok !== true) {
        throw new TelegramApiError(method, response.status);
      }
      return payload;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof TelegramApiError) throw error;
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
      ...(offset === undefined ? {} : { offset }), timeout: 25, allowed_updates: ["message", "callback_query"],
    }, signal);
    const parsed = z.object({ result: z.array(updateSchema) }).safeParse(payload);
    if (!parsed.success) throw new Error("Telegram getUpdates returned an invalid response.");
    return parsed.data.result;
  }

  async sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
    await this.call("sendMessage", {
      chat_id: chatId,
      text,
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    });
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    });
  }

  async setMyCommands(commands: TelegramBotCommand[]): Promise<void> {
    await this.call("setMyCommands", { commands });
  }
}
