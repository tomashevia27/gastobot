import { request } from "node:https";
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

export class TelegramTransportError extends Error {
  constructor(
    public readonly method: string,
    public readonly code: string | null,
  ) {
    super(`Telegram ${method} could not be completed.`);
  }
}

function transportCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const coded = "code" in error ? error : "cause" in error ? error.cause : null;
  if (!coded || typeof coded !== "object" || !("code" in coded)) return null;
  const code = coded.code;
  return typeof code === "string" && /^[A-Z_]+$/.test(code) ? code : null;
}

type TelegramTransport = (
  token: string, method: string, body: object, signal?: AbortSignal,
) => Promise<{ status: number; payload: unknown }>;

const postTelegramJson: TelegramTransport = (token, method, body, signal) => new Promise((resolve, reject) => {
  const json = JSON.stringify(body);
  const connection = request({
    hostname: "api.telegram.org",
    path: `/bot${token}/${method}`,
    method: "POST",
    family: 4,
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(json) },
    signal,
    timeout: method === "getUpdates" ? 32_000 : 10_000,
  }, (response) => {
    let responseBody = "";
    response.setEncoding("utf8");
    response.on("data", (chunk: string) => { responseBody += chunk; });
    response.on("error", reject);
    response.on("end", () => {
      try {
        resolve({ status: response.statusCode ?? 0, payload: JSON.parse(responseBody) as unknown });
      } catch (error) {
        reject(error);
      }
    });
  });
  connection.on("timeout", () => {
    connection.destroy(Object.assign(new Error("Telegram request timed out."), { code: "ETIMEDOUT" }));
  });
  connection.on("error", reject);
  connection.end(json);
});

export interface TelegramClient {
  getMe(): Promise<{ id: number }>;
  getUpdates(offset: number | undefined, signal: AbortSignal): Promise<TelegramUpdate[]>;
  sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void>;
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>;
  setMyCommands(commands: TelegramBotCommand[]): Promise<void>;
}

export class TelegramHttpClient implements TelegramClient {
  constructor(private readonly token: string, private readonly transport: TelegramTransport = postTelegramJson) {}

  private async call(method: string, body: object, signal?: AbortSignal): Promise<unknown> {
    try {
      const { status, payload } = await this.transport(this.token, method, body, signal);
      if (status < 200 || status >= 300 || !payload || typeof payload !== "object" || !("ok" in payload) || payload.ok !== true) {
        throw new TelegramApiError(method, status);
      }
      return payload;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof TelegramApiError) throw error;
      throw new TelegramTransportError(method, transportCode(error));
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
