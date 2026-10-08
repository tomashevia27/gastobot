import { createTelegramExpense, ExpenseValidationError } from "@/modules/expenses/application/operations";
import type { ExpenseStore } from "@/modules/expenses/application/types";
import { CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS } from "@/modules/expenses/domain/constants";
import { formatArsCents } from "@/modules/expenses/domain/money";
import { parseTelegramCommand, TELEGRAM_HELP } from "./command";
import type { TelegramClient, TelegramUpdate } from "./client";

export async function processTelegramUpdate(
  update: TelegramUpdate,
  botId: number,
  allowedUserId: number,
  client: Pick<TelegramClient, "sendMessage">,
  store: ExpenseStore,
): Promise<void> {
  const message = update.message;
  if (!message || message.chat.type !== "private" || message.chat.id !== allowedUserId ||
    message.from?.id !== allowedUserId || typeof message.text !== "string") return;

  const command = parseTelegramCommand(message.text, new Date(message.date * 1000));
  if (command.kind === "help") {
    await client.sendMessage(message.chat.id, TELEGRAM_HELP);
    return;
  }
  if (command.kind === "error") {
    await client.sendMessage(message.chat.id, command.message);
    return;
  }

  try {
    const { expense, created } = await createTelegramExpense(command.input, { botId, updateId: update.update_id }, store);
    if (!expense) {
      await client.sendMessage(message.chat.id, "Este mensaje ya fue procesado y el gasto se eliminó. No se creó otro gasto.");
      return;
    }
    const category = CATEGORY_OPTIONS.find((option) => option.code === expense.category)?.label ?? expense.category;
    const payment = PAYMENT_METHOD_OPTIONS.find((option) => option.code === expense.paymentMethod)?.label ?? expense.paymentMethod;
    const summary = `${formatArsCents(expense.amountCents)} · ${expense.occurredOn} · ${category} · ${payment}`;
    await client.sendMessage(message.chat.id, `${created ? "Gasto guardado" : "Este mensaje ya registró un gasto"}: ${summary}`);
  } catch (error) {
    if (!(error instanceof ExpenseValidationError)) throw error;
    await client.sendMessage(message.chat.id, `No se guardó el gasto. ${Object.values(error.fieldErrors).join(" ")}`);
  }
}
