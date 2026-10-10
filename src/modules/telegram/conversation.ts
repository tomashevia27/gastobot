import { ExpenseValidationError } from "@/modules/expenses/application/operations";
import type { ExpenseDto, TelegramProcessedResult } from "@/modules/expenses/application/types";
import {
  CATEGORY_CODES, CATEGORY_OPTIONS, PAYMENT_METHOD_CODES, PAYMENT_METHOD_OPTIONS,
  type Category, type PaymentMethod,
} from "@/modules/expenses/domain/constants";
import { todayInBuenosAires } from "@/modules/expenses/domain/dates";
import { formatArsCents, parseAmountCents } from "@/modules/expenses/domain/money";
import type { InlineKeyboard } from "./client";
import { TELEGRAM_HELP, TELEGRAM_NO_FLOW_HINT, TELEGRAM_WELCOME } from "./command";
import { formatWrittenDate, parseWrittenDate } from "./written-date";

export const DRAFT_TTL_MS = 10 * 60 * 1000;

export const TELEGRAM_QUICK_BLOCKED =
  "Hay un registro en curso. Terminalo o cancelalo con /cancelar antes de usar /gasto.";

export type CreateExpenseFn = (
  input: unknown,
  updateId: number,
) => Promise<{ expense: ExpenseDto | null; created: boolean }>;

export type RecoverExpenseFn = (updateId: number) => Promise<TelegramProcessedResult | null>;

export type ConversationReply = {
  text?: string;
  keyboard?: InlineKeyboard;
  answerText?: string;
  afterSent?: () => void;
};

export type ConversationMessage = { updateId: number; chatId: number; text: string; sentAt?: Date };
export type ConversationCallback = { updateId: number; chatId: number; data: string };

type DraftStep =
  | "amount" | "payment" | "category" | "date" | "writtenDate"
  | "merchant" | "description" | "review" | "correct";

type FlowField = "amount" | "payment" | "category" | "date" | "merchant" | "description";

const FLOW_ORDER = ["amount", "payment", "category", "date", "merchant", "description", "review"] as const;

type DraftValues = {
  amount?: string;
  payment?: PaymentMethod;
  category?: Category;
  occurredOn?: string;
  merchant?: string | null;
  description?: string | null;
};

type CompleteValues = {
  amount: string;
  payment: PaymentMethod;
  category: Category;
  occurredOn: string;
  merchant: string | null;
  description: string | null;
};

type Draft = {
  flowId: string;
  chatId: number;
  expiresAt: number;
  baseDate: string;
  step: DraftStep;
  awaitingRestart: boolean;
  correcting: boolean;
  values: DraftValues;
  lastHandledUpdateId: number | null;
};

const CALLBACK_TAG = "g";
const START_CALLBACK = "s:start";

const AMOUNT_PROMPT = "¿Cuánto gastaste? Escribí el monto en pesos. Por ejemplo: 8500, 8500,50 o 8.500,50.";
const PAYMENT_PROMPT = "Elegí el medio de pago.";
const CATEGORY_PROMPT = "Elegí la categoría.";
const DATE_PROMPT = "¿Qué día fue?";
const WRITTEN_DATE_PROMPT = "Escribí la fecha con formato DD/MM/AAAA. Por ejemplo: 08/10/2026.";
const MERCHANT_PROMPT = "¿En qué comercio fue? Escribí el nombre o tocá Omitir.";
const DESCRIPTION_PROMPT = "Escribí una descripción o tocá Omitir.";
const CORRECT_PROMPT = "¿Qué campo querés corregir?";
const RESTART_PROMPT = "Ya tenés un gasto en curso. ¿Querés descartarlo y empezar de nuevo?";
const BUTTON_ONLY_PROMPT = "Ese paso se responde con los botones visibles.";
const CANCELLED_MESSAGE = "Se canceló el registro en curso. No se guardó ningún gasto.";
const NOTHING_IN_PROGRESS_MESSAGE = "No hay ningún registro en curso.";
const EXPIRED_NOTICE = "Tu registro anterior venció: pasaron diez minutos y se descartó.";
const STALE_BUTTON_ANSWER = "Ese botón ya no corresponde a este registro.";
const DEAD_FLOW_ANSWER = "Ese registro ya no está activo. Enviá /registrar_gasto para empezar de nuevo.";
const UNKNOWN_BUTTON_ANSWER = "Ese botón no corresponde a este bot.";

const CORRECT_FIELDS: { value: string; step: FlowField; label: string }[] = [
  { value: "amount", step: "amount", label: "Monto" },
  { value: "payment", step: "payment", label: "Medio de pago" },
  { value: "category", step: "category", label: "Categoría" },
  { value: "date", step: "date", label: "Fecha" },
  { value: "merchant", step: "merchant", label: "Comercio" },
  { value: "description", step: "description", label: "Descripción" },
];

function draftCallback(flowId: string, step: DraftStep, action: string): string {
  return `${CALLBACK_TAG}:${flowId}:${step}:${action}`;
}

function parseCallback(data: string): { flowId: string; step: string; action: string } | { start: boolean } | null {
  if (data === START_CALLBACK) return { start: true };
  const parts = data.split(":");
  if (parts.length !== 4 || parts[0] !== CALLBACK_TAG) return null;
  const [, flowId, step, action] = parts;
  if (!flowId || !step || !action) return null;
  return { flowId, step, action };
}

function rows<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += 2) result.push(items.slice(index, index + 2));
  return result;
}

function startKeyboard(label = "Registrar gasto"): InlineKeyboard {
  return [[{ text: label, callback_data: START_CALLBACK }]];
}

function paymentKeyboard(flowId: string): InlineKeyboard {
  return rows(PAYMENT_METHOD_OPTIONS.map((option) => ({
    text: option.label, callback_data: draftCallback(flowId, "payment", option.code),
  })));
}

function categoryKeyboard(flowId: string): InlineKeyboard {
  const categories = CATEGORY_OPTIONS
    .filter((option) => option.code !== "UNCATEGORIZED")
    .map((option) => ({ text: option.label, callback_data: draftCallback(flowId, "category", option.code) }));
  return rows([...categories, { text: "Omitir (sin categoría)", callback_data: draftCallback(flowId, "category", "omit") }]);
}

function dateKeyboard(flowId: string): InlineKeyboard {
  return [
    [{ text: "Hoy", callback_data: draftCallback(flowId, "date", "today") }],
    [{ text: "Ayer", callback_data: draftCallback(flowId, "date", "yesterday") }],
    [{ text: "Otra fecha", callback_data: draftCallback(flowId, "date", "other") }],
  ];
}

function omitKeyboard(flowId: string, step: DraftStep): InlineKeyboard {
  return [[{ text: "Omitir", callback_data: draftCallback(flowId, step, "omit") }]];
}

function reviewKeyboard(flowId: string): InlineKeyboard {
  return ["confirm", "correct", "cancel"].map((action) => [{
    text: action === "confirm" ? "Confirmar" : action === "correct" ? "Corregir" : "Cancelar",
    callback_data: draftCallback(flowId, "review", action),
  }]);
}

function correctKeyboard(flowId: string): InlineKeyboard {
  return rows(CORRECT_FIELDS.map((field) => ({
    text: field.label, callback_data: draftCallback(flowId, "correct", field.value),
  })));
}

function restartKeyboard(draft: Draft): InlineKeyboard {
  return [
    [{ text: "Empezar de nuevo", callback_data: draftCallback(draft.flowId, draft.step, "restart") }],
    [{ text: "Continuar el actual", callback_data: draftCallback(draft.flowId, draft.step, "continue") }],
  ];
}

function labelOf(options: readonly { code: string; label: string }[], code: string): string {
  return options.find((option) => option.code === code)?.label ?? code;
}

function previousCivilDate(civilDate: string): string {
  const [year, month, day] = civilDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 86_400_000).toISOString().slice(0, 10);
}

function summaryText(title: string, values: CompleteValues): string {
  return [
    title,
    `Monto: ${formatArsCents(parseAmountCents(values.amount))}`,
    `Medio: ${labelOf(PAYMENT_METHOD_OPTIONS, values.payment)}`,
    `Categoría: ${labelOf(CATEGORY_OPTIONS, values.category)}`,
    `Fecha: ${formatWrittenDate(values.occurredOn)}`,
    `Comercio: ${values.merchant ?? "—"}`,
    `Descripción: ${values.description ?? "—"}`,
  ].join("\n");
}

function expenseSummaryText(title: string, expense: ExpenseDto): string {
  return [
    title,
    `Monto: ${formatArsCents(expense.amountCents)}`,
    `Medio: ${labelOf(PAYMENT_METHOD_OPTIONS, expense.paymentMethod)}`,
    `Categoría: ${labelOf(CATEGORY_OPTIONS, expense.category)}`,
    `Fecha: ${formatWrittenDate(expense.occurredOn)}`,
    `Comercio: ${expense.merchant ?? "—"}`,
    `Descripción: ${expense.description ?? "—"}`,
  ].join("\n");
}

function newFlowId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 8);
}

function withNotice(reply: ConversationReply, notice: string | null): ConversationReply {
  if (!notice) return reply;
  return { ...reply, text: reply.text ? `${notice}\n\n${reply.text}` : notice };
}

export class TelegramConversation {
  private draft: Draft | null = null;
  private expiredNoticePending = false;
  private readonly createExpense: CreateExpenseFn;
  private readonly recoverExpense: RecoverExpenseFn;
  private readonly now: () => Date;

  constructor(options: { createExpense: CreateExpenseFn; recoverExpense?: RecoverExpenseFn; now?: () => Date }) {
    this.createExpense = options.createExpense;
    this.recoverExpense = options.recoverExpense ?? (async () => null);
    this.now = options.now ?? (() => new Date());
  }

  takeExpiredNotice(): string | null {
    if (this.draft && this.now().getTime() >= this.draft.expiresAt) {
      this.draft = null;
      this.expiredNoticePending = true;
    }
    return this.expiredNoticePending ? EXPIRED_NOTICE : null;
  }

  acknowledgeExpiredNotice(): void {
    this.expiredNoticePending = false;
  }

  hasDraft(): boolean {
    return this.draft !== null;
  }

  async handleStart(): Promise<ConversationReply> {
    const notice = this.takeExpiredNotice();
    if (!this.draft) return withNotice({ text: TELEGRAM_WELCOME, keyboard: startKeyboard() }, notice);
    const pending = this.promptFor(this.draft);
    return withNotice({ text: `${TELEGRAM_WELCOME}\n\n${pending.text}`, keyboard: pending.keyboard }, notice);
  }

  async handleHelp(): Promise<ConversationReply> {
    const notice = this.takeExpiredNotice();
    if (!this.draft) return withNotice({ text: TELEGRAM_HELP }, notice);
    const pending = this.promptFor(this.draft);
    return withNotice({ text: `${TELEGRAM_HELP}\n\n${pending.text}`, keyboard: pending.keyboard }, notice);
  }

  async handleCancel(): Promise<ConversationReply> {
    const notice = this.takeExpiredNotice();
    if (!this.draft) return withNotice({ text: NOTHING_IN_PROGRESS_MESSAGE }, notice);
    const draft = this.draft;
    return withNotice({ text: CANCELLED_MESSAGE, afterSent: () => this.release(draft) }, notice);
  }

  async handleRegister(input: ConversationMessage): Promise<ConversationReply> {
    const notice = this.takeExpiredNotice();
    return withNotice(this.startOrReplace(input.chatId, input.updateId, input.sentAt), notice);
  }

  async handleInput(input: ConversationMessage): Promise<ConversationReply> {
    const notice = this.takeExpiredNotice();
    if (!this.draft) {
      return withNotice({ text: TELEGRAM_NO_FLOW_HINT, keyboard: startKeyboard() }, notice);
    }
    const draft = this.draft;
    if (draft.chatId !== input.chatId) {
      return withNotice({ text: TELEGRAM_NO_FLOW_HINT, keyboard: startKeyboard() }, notice);
    }
    if (draft.lastHandledUpdateId === input.updateId) return withNotice(this.promptFor(draft), notice);
    if (draft.awaitingRestart) {
      return withNotice({ text: `${BUTTON_ONLY_PROMPT}\n\n${RESTART_PROMPT}`, keyboard: restartKeyboard(draft) }, notice);
    }

    switch (draft.step) {
      case "amount":
        return withNotice(this.answerAmount(draft, input.text, input.updateId), notice);
      case "writtenDate":
        return withNotice(this.answerWrittenDate(draft, input.text, input.updateId), notice);
      case "merchant":
        return withNotice(this.answerText(draft, "merchant", input.text, input.updateId), notice);
      case "description":
        return withNotice(this.answerText(draft, "description", input.text, input.updateId), notice);
      default:
        return withNotice({ text: BUTTON_ONLY_PROMPT }, notice);
    }
  }

  async handleCallback(input: ConversationCallback): Promise<ConversationReply> {
    const notice = this.takeExpiredNotice();
    const parsed = parseCallback(input.data);
    if (!parsed) return withNotice({ answerText: UNKNOWN_BUTTON_ANSWER }, notice);

    const draft = this.draft;
    if (draft && draft.chatId === input.chatId && draft.lastHandledUpdateId === input.updateId) {
      return withNotice(this.promptFor(draft), notice);
    }
    if ("start" in parsed) return withNotice(this.startOrReplace(input.chatId, input.updateId), notice);
    if (!draft) {
      if (parsed.step === "review" && parsed.action === "confirm") {
        const recovered = await this.recoverExpense(input.updateId);
        if (recovered) return withNotice(this.recoveredConfirmation(recovered), notice);
      }
      return withNotice({ answerText: DEAD_FLOW_ANSWER }, notice);
    }
    if (draft.chatId !== input.chatId || draft.flowId !== parsed.flowId) {
      return withNotice({ answerText: STALE_BUTTON_ANSWER }, notice);
    }

    const { step, action } = parsed;
    if (draft.awaitingRestart) {
      if (draft.step !== step) return withNotice({ answerText: STALE_BUTTON_ANSWER }, notice);
      if (action === "restart") {
        this.draft = this.startDraft(input.chatId, input.updateId);
        return withNotice(this.promptFor(this.draft), notice);
      }
      if (action === "continue") {
        draft.awaitingRestart = false;
        return withNotice(this.commit(draft, input.updateId), notice);
      }
      return withNotice({ text: RESTART_PROMPT, keyboard: restartKeyboard(draft) }, notice);
    }
    if (draft.step !== step) return withNotice({ answerText: STALE_BUTTON_ANSWER }, notice);

    return withNotice(await this.applyCallback(draft, step, action, input), notice);
  }

  private startOrReplace(chatId: number, updateId: number, sentAt?: Date): ConversationReply {
    if (this.draft) {
      if (this.draft.chatId === chatId && this.draft.lastHandledUpdateId === updateId) {
        return this.promptFor(this.draft);
      }
      if (!this.draft.awaitingRestart) {
        this.draft.awaitingRestart = true;
        return this.commit(this.draft, updateId);
      }
      return this.promptFor(this.draft);
    }
    this.draft = this.startDraft(chatId, updateId, sentAt);
    return this.promptFor(this.draft);
  }

  private startDraft(chatId: number, updateId: number, baseDateAt?: Date): Draft {
    const now = this.now();
    return {
      flowId: newFlowId(),
      chatId,
      expiresAt: now.getTime() + DRAFT_TTL_MS,
      baseDate: todayInBuenosAires(baseDateAt ?? now),
      step: "amount",
      awaitingRestart: false,
      correcting: false,
      values: {},
      lastHandledUpdateId: updateId,
    };
  }

  private commit(draft: Draft, updateId: number): ConversationReply {
    draft.lastHandledUpdateId = updateId;
    return this.promptFor(draft);
  }

  private advance(draft: Draft, from: FlowField): void {
    if (draft.correcting) {
      draft.correcting = false;
      draft.step = "review";
      return;
    }
    draft.step = FLOW_ORDER[FLOW_ORDER.indexOf(from) + 1];
  }

  private answerAmount(draft: Draft, text: string, updateId: number): ConversationReply {
    const value = text.trim();
    try {
      parseAmountCents(value);
    } catch (error) {
      return { text: `${error instanceof Error ? error.message : ""}\n\n${AMOUNT_PROMPT}` };
    }
    draft.values.amount = value;
    this.advance(draft, "amount");
    return this.commit(draft, updateId);
  }

  private answerWrittenDate(draft: Draft, text: string, updateId: number): ConversationReply {
    const civilDate = parseWrittenDate(text);
    if (!civilDate) {
      return { text: `Esa fecha no existe o no usa el formato DD/MM/AAAA.\n\n${WRITTEN_DATE_PROMPT}` };
    }
    draft.values.occurredOn = civilDate;
    this.advance(draft, "date");
    return this.commit(draft, updateId);
  }

  private answerText(draft: Draft, field: "merchant" | "description", text: string, updateId: number): ConversationReply {
    const limit = field === "merchant" ? 120 : 500;
    const prompt = field === "merchant" ? MERCHANT_PROMPT : DESCRIPTION_PROMPT;
    const value = text.trim();
    if (!value) return { text: `Escribí un texto o tocá Omitir.\n\n${prompt}`, keyboard: omitKeyboard(draft.flowId, draft.step) };
    if (value.length > limit) {
      return { text: `El campo admite hasta ${limit} caracteres.\n\n${prompt}`, keyboard: omitKeyboard(draft.flowId, draft.step) };
    }
    draft.values[field] = value;
    this.advance(draft, field);
    return this.commit(draft, updateId);
  }

  private async applyCallback(
    draft: Draft, step: string, action: string, input: ConversationCallback,
  ): Promise<ConversationReply> {
    switch (step) {
      case "payment": {
        if (!(PAYMENT_METHOD_CODES as readonly string[]).includes(action)) return { text: BUTTON_ONLY_PROMPT };
        draft.values.payment = action as PaymentMethod;
        this.advance(draft, "payment");
        return this.commit(draft, input.updateId);
      }
      case "category": {
        if (action === "omit") draft.values.category = "UNCATEGORIZED";
        else if ((CATEGORY_CODES as readonly string[]).includes(action)) draft.values.category = action as Category;
        else return { text: BUTTON_ONLY_PROMPT };
        this.advance(draft, "category");
        return this.commit(draft, input.updateId);
      }
      case "date": {
        if (action === "today") draft.values.occurredOn = draft.baseDate;
        else if (action === "yesterday") draft.values.occurredOn = previousCivilDate(draft.baseDate);
        else if (action === "other") {
          draft.step = "writtenDate";
          return this.commit(draft, input.updateId);
        } else return { text: BUTTON_ONLY_PROMPT };
        this.advance(draft, "date");
        return this.commit(draft, input.updateId);
      }
      case "merchant":
      case "description": {
        if (action !== "omit") return { text: BUTTON_ONLY_PROMPT };
        draft.values[step] = null;
        this.advance(draft, step);
        return this.commit(draft, input.updateId);
      }
      case "review": {
        if (action === "confirm") return this.confirm(draft, input.updateId);
        if (action === "correct") {
          draft.step = "correct";
          return this.commit(draft, input.updateId);
        }
        if (action === "cancel") {
          return { text: CANCELLED_MESSAGE, afterSent: () => this.release(draft) };
        }
        return { text: BUTTON_ONLY_PROMPT };
      }
      case "correct": {
        const field = CORRECT_FIELDS.find((candidate) => candidate.value === action);
        if (!field) return { text: BUTTON_ONLY_PROMPT };
        draft.step = field.step;
        draft.correcting = true;
        return this.commit(draft, input.updateId);
      }
      default:
        return { answerText: UNKNOWN_BUTTON_ANSWER };
    }
  }

  private async confirm(draft: Draft, updateId: number): Promise<ConversationReply> {
    const values = this.completeValues(draft);
    let result: { expense: ExpenseDto | null; created: boolean };
    try {
      result = await this.createExpense({
        amount: values.amount,
        occurredOn: values.occurredOn,
        category: values.category,
        paymentMethod: values.payment,
        merchant: values.merchant ?? undefined,
        description: values.description ?? undefined,
      }, updateId);
    } catch (error) {
      if (!(error instanceof ExpenseValidationError)) throw error;
      return {
        text: `No se guardó el gasto. ${Object.values(error.fieldErrors).join(" ")}\n\n${summaryText("Revisá el gasto", values)}`,
        keyboard: reviewKeyboard(draft.flowId),
      };
    }
    if (!result.expense) {
      return {
        text: "Este mensaje ya fue procesado y el gasto se eliminó. No se creó otro gasto.",
        keyboard: startKeyboard(),
        afterSent: () => this.release(draft),
      };
    }
    return {
      text: summaryText("✅ Gasto registrado", values),
      keyboard: startKeyboard("Registrar otro gasto"),
      afterSent: () => this.release(draft),
    };
  }

  private recoveredConfirmation(result: TelegramProcessedResult): ConversationReply {
    if (!result.expense) {
      return {
        text: "Este mensaje ya fue procesado y el gasto se eliminó. No se creó otro gasto.",
        keyboard: startKeyboard(),
      };
    }
    return {
      text: expenseSummaryText("✅ Gasto registrado", result.expense),
      keyboard: startKeyboard("Registrar otro gasto"),
    };
  }

  private release(draft: Draft): void {
    if (this.draft === draft) this.draft = null;
  }

  private completeValues(draft: Draft): CompleteValues {
    const values = draft.values;
    if (!values.amount || !values.payment || !values.category || !values.occurredOn) {
      throw new Error("Guided draft is missing required fields.");
    }
    return {
      amount: values.amount,
      payment: values.payment,
      category: values.category,
      occurredOn: values.occurredOn,
      merchant: values.merchant ?? null,
      description: values.description ?? null,
    };
  }

  private promptFor(draft: Draft): ConversationReply {
    if (draft.awaitingRestart) return { text: RESTART_PROMPT, keyboard: restartKeyboard(draft) };
    switch (draft.step) {
      case "amount": return { text: AMOUNT_PROMPT };
      case "payment": return { text: PAYMENT_PROMPT, keyboard: paymentKeyboard(draft.flowId) };
      case "category": return { text: CATEGORY_PROMPT, keyboard: categoryKeyboard(draft.flowId) };
      case "date": return { text: DATE_PROMPT, keyboard: dateKeyboard(draft.flowId) };
      case "writtenDate": return { text: WRITTEN_DATE_PROMPT };
      case "merchant": return { text: MERCHANT_PROMPT, keyboard: omitKeyboard(draft.flowId, "merchant") };
      case "description": return { text: DESCRIPTION_PROMPT, keyboard: omitKeyboard(draft.flowId, "description") };
      case "correct": return { text: CORRECT_PROMPT, keyboard: correctKeyboard(draft.flowId) };
      case "review": return { text: summaryText("Revisá el gasto", this.completeValues(draft)), keyboard: reviewKeyboard(draft.flowId) };
      default: throw new Error("Unknown guided draft step.");
    }
  }
}
