import { describe, expect, it, vi } from "vitest";
import { ExpenseValidationError } from "@/modules/expenses/application/operations";
import type { ExpenseDto } from "@/modules/expenses/application/types";
import { formatArsCents } from "@/modules/expenses/domain/money";
import {
  DRAFT_TTL_MS, TelegramConversation, type ConversationReply, type CreateExpenseFn, type RecoverExpenseFn,
} from "./conversation";

const chatId = 4242;

function expenseDto(overrides: Partial<ExpenseDto> = {}): ExpenseDto {
  return {
    id: "9f1d5f0e-0000-4000-8000-000000000001",
    amountCents: 850050,
    currency: "ARS",
    occurredOn: "2026-10-08",
    category: "FOOD",
    paymentMethod: "CASH",
    merchant: "Kiosco Norte",
    description: "Almuerzo",
    source: "TELEGRAM",
    createdAt: "2026-10-08T15:00:00.000Z",
    updatedAt: "2026-10-08T15:00:00.000Z",
    ...overrides,
  };
}

function harness(options: {
  now?: () => Date;
  createExpense?: ReturnType<typeof vi.fn<CreateExpenseFn>>;
  recoverExpense?: ReturnType<typeof vi.fn<RecoverExpenseFn>>;
} = {}) {
  const createExpense = options.createExpense
    ?? vi.fn<CreateExpenseFn>().mockResolvedValue({ expense: expenseDto(), created: true });
  const conversation = new TelegramConversation({
    createExpense,
    recoverExpense: options.recoverExpense,
    now: options.now ?? (() => new Date("2026-10-08T15:00:00Z")),
  });
  let lastUpdateId = 1000;
  const nextUpdateId = () => ++lastUpdateId;

  const register = (sentAt?: Date) => conversation.handleRegister({
    updateId: nextUpdateId(), chatId, text: "/registrar_gasto", sentAt,
  });
  const message = (text: string) => conversation.handleInput({ updateId: nextUpdateId(), chatId, text });
  const press = (reply: ConversationReply, label: string) => {
    const button = reply.keyboard?.flat().find((candidate) => candidate.text === label);
    if (!button) throw new Error(`No button labelled ${label} in ${JSON.stringify(reply.keyboard)}`);
    return conversation.handleCallback({ updateId: nextUpdateId(), chatId, data: button.callback_data });
  };
  const pressData = (data: string) => conversation.handleCallback({ updateId: nextUpdateId(), chatId, data });

  return { conversation, createExpense, register, message, press, pressData };
}

function clock(initialIso: string) {
  let current = new Date(initialIso);
  return {
    now: () => current,
    advance(ms: number) { current = new Date(current.getTime() + ms); },
    set(iso: string) { current = new Date(iso); },
  };
}

async function driveToReview(steps: ReturnType<typeof harness>) {
  const payment = await steps.register().then(() => steps.message("8500"));
  const category = await steps.press(payment, "Efectivo");
  const date = await steps.press(category, "Comida");
  await steps.press(date, "Hoy");
  await steps.message("Kiosco Norte");
  return steps.message("Almuerzo");
}

describe("Guided expense draft", () => {
  it("asks one field at a time and saves only when the summary is confirmed", async () => {
    const steps = harness();

    const first = await steps.register();
    expect(first.text).toContain("¿Cuánto gastaste?");
    expect(first.keyboard).toBeUndefined();
    expect(steps.createExpense).not.toHaveBeenCalled();
    expect(steps.conversation.hasDraft()).toBe(true);

    const payment = await steps.message("8.500,50");
    expect(payment.text).toBe("Elegí el medio de pago.");
    expect(payment.keyboard?.flat().map((button) => button.text)).toEqual([
      "Efectivo", "Mercado Pago", "Débito", "Crédito", "Transferencia", "Otro",
    ]);

    const category = await steps.press(payment, "Mercado Pago");
    expect(category.text).toBe("Elegí la categoría.");
    expect(category.keyboard?.flat().map((button) => button.callback_data)).toEqual([
      expect.stringContaining(":category:FOOD"),
      expect.stringContaining(":category:SUPERMARKET"),
      expect.stringContaining(":category:TRANSPORT"),
      expect.stringContaining(":category:FUEL"),
      expect.stringContaining(":category:OUTINGS"),
      expect.stringContaining(":category:EDUCATION"),
      expect.stringContaining(":category:HEALTH"),
      expect.stringContaining(":category:SERVICES"),
      expect.stringContaining(":category:OTHER"),
      expect.stringContaining(":category:omit"),
    ]);

    const date = await steps.press(category, "Comida");
    expect(date.keyboard?.flat().map((button) => button.text)).toEqual(["Hoy", "Ayer", "Otra fecha"]);

    const merchant = await steps.press(date, "Hoy");
    expect(merchant.keyboard?.flat().map((button) => button.text)).toEqual(["Omitir"]);

    const description = await steps.message("Kiosco Norte");
    expect(description.text).toContain("descripción");

    const review = await steps.press(description, "Omitir");
    expect(review.text).toBe([
      "Revisá el gasto",
      "Monto: " + formatArsCents(850050),
      "Medio: Mercado Pago",
      "Categoría: Comida",
      "Fecha: 08/10/2026",
      "Comercio: Kiosco Norte",
      "Descripción: —",
    ].join("\n"));
    expect(review.keyboard?.flat().map((button) => button.text)).toEqual(["Confirmar", "Corregir", "Cancelar"]);
    expect(steps.createExpense).not.toHaveBeenCalled();

    const saved = await steps.press(review, "Confirmar");
    expect(steps.createExpense).toHaveBeenCalledTimes(1);
    expect(steps.createExpense).toHaveBeenCalledWith({
      amount: "8.500,50",
      occurredOn: "2026-10-08",
      category: "FOOD",
      paymentMethod: "MERCADO_PAGO",
      merchant: "Kiosco Norte",
      description: undefined,
    }, expect.any(Number));
    expect(saved.text).toBe([
      "✅ Gasto registrado",
      "Monto: " + formatArsCents(850050),
      "Medio: Mercado Pago",
      "Categoría: Comida",
      "Fecha: 08/10/2026",
      "Comercio: Kiosco Norte",
      "Descripción: —",
    ].join("\n"));
    expect(saved.keyboard?.flat().map((button) => button.text)).toEqual(["Registrar otro gasto"]);
    expect(steps.conversation.hasDraft()).toBe(true);
    saved.afterSent?.();
    expect(steps.conversation.hasDraft()).toBe(false);
  });

  it("keeps the current step and explains the amount formats on invalid input", async () => {
    const steps = harness();
    await steps.register();

    const invalid = await steps.message("no es un monto");
    expect(invalid.text).toContain("8.500,50");
    expect(invalid.text).toContain("¿Cuánto gastaste?");

    const outOfRange = await steps.message("0");
    expect(outOfRange.text).toContain("$0,01");

    const valid = await steps.message("8500,50");
    expect(valid.text).toBe("Elegí el medio de pago.");
    expect(steps.conversation.hasDraft()).toBe(true);
  });

  it("asks for buttons when a closed choice receives free text", async () => {
    const steps = harness();
    await steps.register();
    const payment = await steps.message("8500");

    const freeText = await steps.message("efectivo");
    expect(freeText.text).toContain("botones");

    const category = await steps.press(payment, "Efectivo");
    expect(category.text).toBe("Elegí la categoría.");
  });

  it("applies omissions for category, merchant and description", async () => {
    const steps = harness();
    await steps.register();
    const payment = await steps.message("1000");
    const category = await steps.press(payment, "Efectivo");
    const date = await steps.press(category, "Omitir (sin categoría)");
    const merchant = await steps.press(date, "Hoy");
    const description = await steps.press(merchant, "Omitir");
    const review = await steps.press(description, "Omitir");

    expect(review.text).toContain("Categoría: Sin categoría");
    expect(review.text).toContain("Comercio: —");
    expect(review.text).toContain("Descripción: —");
    expect(review.text).toContain("Fecha: 08/10/2026");
  });

  it("accepts a written date only when it exists on the calendar", async () => {
    const steps = harness();
    await steps.register();
    const payment = await steps.message("1000");
    const category = await steps.press(payment, "Efectivo");
    const date = await steps.press(category, "Comida");
    const written = await steps.press(date, "Otra fecha");
    expect(written.text).toContain("DD/MM/AAAA");

    const impossible = await steps.message("31/02/2026");
    expect(impossible.text).toContain("no existe");
    expect(impossible.text).toContain("DD/MM/AAAA");

    const wrongFormat = await steps.message("2026-02-31");
    expect(wrongFormat.text).toContain("no existe");

    const merchant = await steps.message("09/03/2024");
    const description = await steps.press(merchant, "Omitir");
    const review = await steps.press(description, "Omitir");
    expect(review.text).toContain("Fecha: 09/03/2024");
  });

  it("uses yesterday relative to the day the flow started", async () => {
    const steps = harness();
    await steps.register();
    const payment = await steps.message("1000");
    const category = await steps.press(payment, "Efectivo");
    const date = await steps.press(category, "Comida");
    const merchant = await steps.press(date, "Ayer");
    const description = await steps.press(merchant, "Omitir");
    const review = await steps.press(description, "Omitir");
    expect(review.text).toContain("Fecha: 07/10/2026");
  });

  it("fixes the default date at the start even when the flow crosses midnight", async () => {
    const time = clock("2026-10-09T02:55:00Z");
    const steps = harness({ now: time.now });
    await steps.register();
    const payment = await steps.message("1000");
    const category = await steps.press(payment, "Efectivo");

    time.set("2026-10-09T03:01:00Z");
    const date = await steps.press(category, "Comida");
    const merchant = await steps.press(date, "Hoy");
    const description = await steps.press(merchant, "Omitir");
    const review = await steps.press(description, "Omitir");
    expect(review.text).toContain("Fecha: 08/10/2026");
  });

  it("uses the local date of the register message when processing is delayed", async () => {
    const steps = harness({ now: () => new Date("2026-10-09T03:10:00Z") });
    await steps.register(new Date("2026-10-09T02:55:00Z"));
    const payment = await steps.message("1000");
    const category = await steps.press(payment, "Efectivo");
    const date = await steps.press(category, "Comida");
    const merchant = await steps.press(date, "Hoy");
    const description = await steps.press(merchant, "Omitir");
    const review = await steps.press(description, "Omitir");
    expect(review.text).toContain("Fecha: 08/10/2026");
  });

  it("corrects any field from the review and returns to the review", async () => {
    const steps = harness();
    const review = await driveToReview(steps);

    const choices = await steps.press(review, "Corregir");
    expect(choices.text).toBe("¿Qué campo querés corregir?");
    expect(choices.keyboard?.flat().map((button) => button.text)).toEqual([
      "Monto", "Medio de pago", "Categoría", "Fecha", "Comercio", "Descripción",
    ]);

    const amount = await steps.press(choices, "Monto");
    expect(amount.text).toContain("¿Cuánto gastaste?");
    const corrected = await steps.message("1.234,56");
    expect(corrected.text).toContain(`Monto: ${formatArsCents(123456)}`);
    expect(corrected.text).toContain("Medio: Efectivo");

    const paymentChoice = await steps.press(corrected, "Corregir");
    const payment = await steps.press(paymentChoice, "Medio de pago");
    const afterPayment = await steps.press(payment, "Crédito");
    expect(afterPayment.text).toContain("Medio: Crédito");
    expect(steps.createExpense).not.toHaveBeenCalled();

    const categoryChoice = await steps.press(afterPayment, "Corregir");
    const category = await steps.press(categoryChoice, "Categoría");
    const afterCategory = await steps.press(category, "Omitir (sin categoría)");
    expect(afterCategory.text).toContain("Categoría: Sin categoría");
    expect(afterCategory.text).toContain("Monto: " + formatArsCents(123456));
  });

  it("lets a correction clear an optional field", async () => {
    const steps = harness();
    const review = await driveToReview(steps);
    expect(review.text).toContain("Comercio: Kiosco Norte");

    const choices = await steps.press(review, "Corregir");
    const merchant = await steps.press(choices, "Comercio");
    expect(merchant.keyboard?.flat().map((button) => button.text)).toEqual(["Omitir"]);

    const cleared = await steps.press(merchant, "Omitir");
    expect(cleared.text).toContain("Comercio: —");
    expect(cleared.text).toContain("Descripción: Almuerzo");
  });

  it("cancels from any step without creating an expense", async () => {
    const steps = harness();
    await steps.register();
    await steps.message("8500");

    const cancelled = await steps.conversation.handleCancel();
    expect(cancelled.text).toBe("Se canceló el registro en curso. No se guardó ningún gasto.");
    expect(steps.conversation.hasDraft()).toBe(true);
    cancelled.afterSent?.();
    expect(steps.conversation.hasDraft()).toBe(false);
    expect(steps.createExpense).not.toHaveBeenCalled();

    const again = await steps.conversation.handleCancel();
    expect(again.text).toBe("No hay ningún registro en curso.");
  });

  it("cancels from the review through its button", async () => {
    const steps = harness();
    const review = await driveToReview(steps);

    const cancelled = await steps.press(review, "Cancelar");
    expect(cancelled.text).toBe("Se canceló el registro en curso. No se guardó ningún gasto.");
    expect(steps.conversation.hasDraft()).toBe(true);
    cancelled.afterSent?.();
    expect(steps.conversation.hasDraft()).toBe(false);
    expect(steps.createExpense).not.toHaveBeenCalled();
  });

  it("asks before replacing an active draft and restarts only on confirmation", async () => {
    const steps = harness();
    await steps.register();
    await steps.message("8500");

    const asked = await steps.register();
    expect(asked.text).toBe("Ya tenés un gasto en curso. ¿Querés descartarlo y empezar de nuevo?");
    expect(asked.keyboard?.flat().map((button) => button.text)).toEqual(["Empezar de nuevo", "Continuar el actual"]);

    const resumed = await steps.press(asked, "Continuar el actual");
    expect(resumed.text).toBe("Elegí el medio de pago.");

    const askedAgain = await steps.register();
    const restarted = await steps.press(askedAgain, "Empezar de nuevo");
    expect(restarted.text).toContain("¿Cuánto gastaste?");

    const payment = await steps.message("8500");
    const category = await steps.press(payment, "Efectivo");
    expect(category.text).toBe("Elegí la categoría.");
    expect(steps.createExpense).not.toHaveBeenCalled();
  });

  it("expires ten minutes after the start and offers to start again", async () => {
    const time = clock("2026-10-08T15:00:00Z");
    const steps = harness({ now: time.now });
    await steps.register();
    await steps.message("8500");

    time.advance(DRAFT_TTL_MS - 1);
    const stillAlive = await steps.message("fuera del paso");
    expect(stillAlive.text).toContain("botones");

    expect(steps.conversation.takeExpiredNotice()).toBeNull();

    time.advance(1);
    const afterExpiry = await steps.message("8500");
    expect(afterExpiry.text).toContain("venció");
    expect(afterExpiry.text).toContain("/registrar_gasto");
    expect(afterExpiry.keyboard?.flat().map((button) => button.text)).toEqual(["Registrar gasto"]);
    expect(steps.createExpense).not.toHaveBeenCalled();
  });

  it("keeps the expiry notice until a reply acknowledges it", async () => {
    const time = clock("2026-10-08T15:00:00Z");
    const steps = harness({ now: time.now });
    await steps.register();
    expect(steps.conversation.takeExpiredNotice()).toBeNull();

    time.advance(DRAFT_TTL_MS);
    expect(steps.conversation.takeExpiredNotice()).toContain("venció");
    expect(steps.conversation.hasDraft()).toBe(false);
    expect(steps.conversation.takeExpiredNotice()).toContain("venció");
    steps.conversation.acknowledgeExpiredNotice();
    expect(steps.conversation.takeExpiredNotice()).toBeNull();
  });

  it("tells an expired button press that the draft is gone", async () => {
    const time = clock("2026-10-08T15:00:00Z");
    const steps = harness({ now: time.now });
    await steps.register();
    const payment = await steps.message("8500");
    time.advance(DRAFT_TTL_MS + 1000);

    const pressed = await steps.press(payment, "Efectivo");
    expect(pressed.text).toContain("venció");
    expect(steps.conversation.hasDraft()).toBe(false);
    expect(steps.createExpense).not.toHaveBeenCalled();
  });

  it("ignores buttons from an old step, another draft or unknown data", async () => {
    const steps = harness();
    await steps.register();
    const payment = await steps.message("8500");
    const paymentData = payment.keyboard!.flat()[0].callback_data;

    const foreignDraft = await steps.pressData(paymentData.replace(paymentData.split(":")[1], "deadbeef"));
    expect(foreignDraft.answerText).toContain("ya no corresponde");
    expect(foreignDraft.text).toBeUndefined();

    const category = await steps.press(payment, "Efectivo");
    expect(category.text).toBe("Elegí la categoría.");

    const oldStep = await steps.pressData(paymentData);
    expect(oldStep.answerText).toContain("ya no corresponde");
    expect(oldStep.text).toBeUndefined();

    const unknown = await steps.pressData("nonsense");
    expect(unknown.answerText).toContain("no corresponde a este bot");

    const cancellation = await steps.conversation.handleCancel();
    cancellation.afterSent?.();
    const dead = await steps.pressData("g:deadbeef:category:FOOD");
    expect(dead.answerText).toContain("ya no está activo");
    expect(steps.createExpense).not.toHaveBeenCalled();
  });

  it("does not advance twice when the same update is processed again", async () => {
    const steps = harness();
    const registerReply = await steps.conversation.handleRegister({ updateId: 77, chatId, text: "/registrar_gasto" });
    const replayedRegister = await steps.conversation.handleRegister({ updateId: 77, chatId, text: "/registrar_gasto" });
    expect(replayedRegister.text).toBe(registerReply.text);

    const firstAnswer = await steps.conversation.handleInput({ updateId: 78, chatId, text: "8500" });
    expect(firstAnswer.text).toBe("Elegí el medio de pago.");
    const replayedAnswer = await steps.conversation.handleInput({ updateId: 78, chatId, text: "8500" });
    expect(replayedAnswer.text).toBe("Elegí el medio de pago.");

    const category = await steps.press(replayedAnswer, "Efectivo");
    expect(category.text).toBe("Elegí la categoría.");
  });

  it("re-runs the confirmation for a retried update without duplicating the expense", async () => {
    const createExpense = vi.fn<CreateExpenseFn>()
      .mockResolvedValueOnce({ expense: expenseDto(), created: true })
      .mockResolvedValueOnce({ expense: expenseDto(), created: false });
    const steps = harness({ createExpense });
    const review = await driveToReview(steps);

    const confirmData = review.keyboard!.flat()[0].callback_data;
    const confirmUpdateId = 555;
    const firstTry = await steps.conversation.handleCallback({ updateId: confirmUpdateId, chatId, data: confirmData });
    expect(firstTry.text).toContain("✅ Gasto registrado");

    const retry = await steps.conversation.handleCallback({ updateId: confirmUpdateId, chatId, data: confirmData });
    expect(retry.text).toContain("✅ Gasto registrado");
    expect(createExpense).toHaveBeenCalledTimes(2);

    firstTry.afterSent?.();
    expect(steps.conversation.hasDraft()).toBe(false);
  });

  it("recovers a persisted confirmation after the conversation restarts", async () => {
    const recoverExpense = vi.fn<RecoverExpenseFn>().mockResolvedValue({ expense: expenseDto() });
    const restarted = harness({ recoverExpense });
    const reply = await restarted.conversation.handleCallback({
      updateId: 555,
      chatId,
      data: "g:deadbeef:review:confirm",
    });

    expect(recoverExpense).toHaveBeenCalledWith(555);
    expect(reply.text).toContain("✅ Gasto registrado");
    expect(reply.keyboard?.flat().map((button) => button.text)).toEqual(["Registrar otro gasto"]);
  });

  it("reports a validation failure without claiming success and keeps the review", async () => {
    const createExpense = vi.fn<CreateExpenseFn>().mockRejectedValue(
      new ExpenseValidationError({ amount: "Ingresá un monto válido." }),
    );
    const steps = harness({ createExpense });
    const review = await driveToReview(steps);

    const failed = await steps.press(review, "Confirmar");
    expect(failed.text).toContain("No se guardó el gasto");
    expect(failed.text).not.toContain("✅");
    expect(failed.text).toContain("Revisá el gasto");
    expect(failed.afterSent).toBeUndefined();
    expect(steps.conversation.hasDraft()).toBe(true);

    const retry = await steps.press(failed, "Confirmar");
    expect(retry.text).toContain("No se guardó el gasto");
  });

  it("keeps the draft when /start or /ayuda arrive mid-flow and recalls the pending question", async () => {
    const steps = harness();
    await steps.register();
    const pending = await steps.message("8500");

    const start = await steps.conversation.handleStart();
    expect(start.text).toContain("GastoBot");
    expect(start.text).toContain("Elegí el medio de pago.");
    expect(start.keyboard?.flat().map((button) => button.text)).toContain("Efectivo");

    const help = await steps.conversation.handleHelp();
    expect(help.text).toContain("/registrar_gasto");
    expect(help.text).toContain("/gasto MONTO MEDIO");
    expect(help.text).toContain("Elegí el medio de pago.");

    expect(steps.conversation.hasDraft()).toBe(true);
    const category = await steps.press(pending, "Efectivo");
    expect(category.text).toBe("Elegí la categoría.");
  });

  it("explains how to start when free text arrives without a draft", async () => {
    const steps = harness();
    const hint = await steps.message("gasté en el supermercado");
    expect(hint.text).toContain("/registrar_gasto");
    expect(hint.text).toContain("/ayuda");
    expect(hint.keyboard?.flat().map((button) => button.text)).toEqual(["Registrar gasto"]);
    expect(steps.createExpense).not.toHaveBeenCalled();

    const started = await steps.press(hint, "Registrar gasto");
    expect(started.text).toContain("¿Cuánto gastaste?");
    expect(steps.conversation.hasDraft()).toBe(true);
  });

  it("asks the replacement question when the start button is pressed with an active draft", async () => {
    const steps = harness();
    await steps.register();
    const payment = await steps.message("8500");
    const asked = await steps.pressData("s:start");
    expect(asked.text).toContain("Ya tenés un gasto en curso");
    const resumed = await steps.press(asked, "Continuar el actual");
    expect(resumed.text).toBe(payment.text);
    expect(steps.conversation.hasDraft()).toBe(true);
  });

  it("rejects free text longer than the field limits and empty text", async () => {
    const steps = harness();
    await steps.register();
    const payment = await steps.message("8500");
    const category = await steps.press(payment, "Efectivo");
    const date = await steps.press(category, "Comida");
    await steps.press(date, "Hoy");

    const empty = await steps.message("   ");
    expect(empty.text).toContain("Omitir");

    const tooLong = await steps.message("x".repeat(121));
    expect(tooLong.text).toContain("120 caracteres");

    const merchant = await steps.message("Kiosco Norte");
    expect(merchant.text).toContain("descripción");

    const descriptionTooLong = await steps.message("x".repeat(501));
    expect(descriptionTooLong.text).toContain("500 caracteres");

    const review = await steps.message("Almuerzo");
    expect(review.text).toContain("Comercio: Kiosco Norte");
    expect(review.text).toContain("Descripción: Almuerzo");
  });
});
