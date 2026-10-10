import { createTelegramExpense, ExpenseValidationError } from "@/modules/expenses/application/operations";
import type { ExpenseStore } from "@/modules/expenses/application/types";
import { CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS } from "@/modules/expenses/domain/constants";
import { formatArsCents } from "@/modules/expenses/domain/money";
import { isQuickGastoCommand, parseTelegramCommand, type ParsedCommand } from "./command";
import { TelegramApiError, type TelegramClient, type TelegramUpdate } from "./client";
import { TELEGRAM_QUICK_BLOCKED, TelegramConversation, type ConversationReply } from "./conversation";

type QuickGastoInput = Extract<ParsedCommand, { kind: "create" }>["input"];

export type TelegramReplyClient = Pick<TelegramClient, "sendMessage" | "answerCallbackQuery">;

async function sendReply(
  client: Pick<TelegramClient, "sendMessage">,
  chatId: number,
  reply: ConversationReply,
  notice: string | null = null,
): Promise<void> {
  const parts = [notice, reply.text].filter((part): part is string => Boolean(part));
  if (parts.length > 0) {
    const text = parts.join("\n\n");
    if (reply.keyboard) await client.sendMessage(chatId, text, reply.keyboard);
    else await client.sendMessage(chatId, text);
  }
  reply.afterSent?.();
}

async function deliverReply(
  client: Pick<TelegramClient, "sendMessage">,
  chatId: number,
  reply: ConversationReply,
  conversation: TelegramConversation,
  notice: string | null = null,
): Promise<void> {
  await sendReply(client, chatId, reply, notice);
  conversation.acknowledgeExpiredNotice();
}

async function createQuickGasto(
  input: QuickGastoInput,
  updateId: number,
  botId: number,
  store: ExpenseStore,
): Promise<ConversationReply> {
  try {
    const { expense, created } = await createTelegramExpense(input, { botId, updateId }, store);
    if (!expense) return { text: "Este mensaje ya fue procesado y el gasto se eliminó. No se creó otro gasto." };
    const category = CATEGORY_OPTIONS.find((option) => option.code === expense.category)?.label ?? expense.category;
    const payment = PAYMENT_METHOD_OPTIONS.find((option) => option.code === expense.paymentMethod)?.label ?? expense.paymentMethod;
    const summary = `${expense.title ? `${expense.title} · ` : ""}${formatArsCents(expense.amountCents)} · ${expense.occurredOn} · ${category} · ${payment}`;
    return { text: `${created ? "Gasto guardado" : "Este mensaje ya registró un gasto"}: ${summary}` };
  } catch (error) {
    if (!(error instanceof ExpenseValidationError)) throw error;
    return { text: `No se guardó el gasto. ${Object.values(error.fieldErrors).join(" ")}` };
  }
}

export async function processTelegramUpdate(
  update: TelegramUpdate,
  botId: number,
  allowedUserId: number,
  client: TelegramReplyClient,
  store: ExpenseStore,
  conversation: TelegramConversation,
): Promise<void> {
  const callback = update.callback_query;
  if (callback) {
    const message = callback.message;
    if (!message || message.chat.type !== "private" || message.chat.id !== allowedUserId ||
      callback.from.id !== allowedUserId || typeof callback.data !== "string") return;
    let reply = await conversation.handleCallback({
      updateId: update.update_id, chatId: message.chat.id, data: callback.data,
    });
    try {
      await client.answerCallbackQuery(callback.id, reply.answerText);
    } catch (error) {
      const nonRetryable = error instanceof TelegramApiError && error.method === "answerCallbackQuery" &&
        error.status >= 400 && error.status < 500;
      if (!nonRetryable) throw error;
      if (reply.answerText && !reply.text) reply = { ...reply, text: reply.answerText };
    }
    await deliverReply(client, message.chat.id, reply, conversation);
    return;
  }

  const message = update.message;
  if (!message || message.chat.type !== "private" || message.chat.id !== allowedUserId ||
    message.from?.id !== allowedUserId || typeof message.text !== "string") return;

  const chatId = message.chat.id;
  const text = message.text;
  const sentAt = new Date(message.date * 1000);
  const command = parseTelegramCommand(text, sentAt);

  // The quick command is never an answer to a guided step.
  if (command.kind === "create" || (command.kind === "error" && isQuickGastoCommand(text))) {
    const notice = conversation.takeExpiredNotice();
    if (conversation.hasDraft()) {
      await deliverReply(client, chatId, { text: TELEGRAM_QUICK_BLOCKED }, conversation);
      return;
    }
    const reply = command.kind === "error"
      ? { text: command.message }
      : await createQuickGasto(command.input, update.update_id, botId, store);
    await deliverReply(client, chatId, reply, conversation, notice);
    return;
  }

  switch (command.kind) {
    case "welcome":
      await deliverReply(client, chatId, await conversation.handleStart(), conversation);
      return;
    case "help":
      await deliverReply(client, chatId, await conversation.handleHelp(), conversation);
      return;
    case "cancel":
      await deliverReply(client, chatId, await conversation.handleCancel(), conversation);
      return;
    case "register":
      await deliverReply(client, chatId, await conversation.handleRegister({
        updateId: update.update_id, chatId, text, sentAt,
      }), conversation);
      return;
    case "error": {
      const isCommand = text.trim().startsWith("/");
      const notice = isCommand ? conversation.takeExpiredNotice() : null;
      const reply = isCommand
        ? { text: command.message }
        : await conversation.handleInput({ updateId: update.update_id, chatId, text });
      await deliverReply(client, chatId, reply, conversation, notice);
      return;
    }
    default:
      return;
  }
}
