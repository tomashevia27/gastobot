import { describe, expect, it } from "vitest";
import { isQuickGastoCommand, parseTelegramCommand } from "./command";

const sentAt = new Date("2026-10-09T00:30:00Z");

describe("Telegram commands", () => {
  it("parses explicit values and quoted optional text", () => {
    expect(parseTelegramCommand('/gasto 8.500,50 efectivo --descripcion "Almuerzo con Tomás" --categoria comida --fecha 2026-10-06 --comercio "Kiosco Norte"', sentAt)).toEqual({
      kind: "create",
      input: { amount: "8.500,50", paymentMethod: "CASH", category: "FOOD", occurredOn: "2026-10-06", merchant: "Kiosco Norte", description: "Almuerzo con Tomás" },
    });
  });

  it("uses the message's Buenos Aires date, including across UTC midnight", () => {
    expect(parseTelegramCommand("/gasto 10 mercado_pago", sentAt)).toEqual({
      kind: "create", input: { amount: "10", paymentMethod: "MERCADO_PAGO", occurredOn: "2026-10-08" },
    });
  });

  it("classifies the guided flow, cancellation and help commands", () => {
    expect(parseTelegramCommand("/registrar_gasto", sentAt).kind).toBe("register");
    expect(parseTelegramCommand("/registrar-gasto", sentAt).kind).toBe("register");
    expect(parseTelegramCommand("/cancelar", sentAt).kind).toBe("cancel");
    expect(parseTelegramCommand("/start", sentAt).kind).toBe("welcome");
    expect(parseTelegramCommand("/ayuda", sentAt).kind).toBe("help");
    expect(parseTelegramCommand("/help", sentAt).kind).toBe("help");
  });

  it("accepts commands with the bot username suffix", () => {
    expect(parseTelegramCommand("/registrar_gasto@MiGastoBot", sentAt).kind).toBe("register");
    expect(parseTelegramCommand("/gasto@MiGastoBot 10 efectivo", sentAt)).toEqual({
      kind: "create", input: { amount: "10", paymentMethod: "CASH", occurredOn: "2026-10-08" },
    });
    expect(isQuickGastoCommand("/gasto@MiGastoBot 10 efectivo")).toBe(true);
    expect(isQuickGastoCommand("gasto 10 efectivo")).toBe(false);
    expect(isQuickGastoCommand("/registrar_gasto")).toBe(false);
  });

  it("tells free text how to start the guided flow", () => {
    expect(parseTelegramCommand("gasté mucho hoy", sentAt)).toEqual({
      kind: "error", message: "No hay un registro en curso. Enviá /registrar_gasto para empezar uno paso a paso o /ayuda para ver los comandos.",
    });
  });

  it("rejects unknown commands", () => {
    expect(parseTelegramCommand("/borrar 10", sentAt)).toEqual({
      kind: "error", message: "Comando desconocido. Usá /ayuda.",
    });
  });

  it.each([
    "/gasto", "/gasto 10 paypal", "/gasto 10 efectivo --categoria viajes",
    "/gasto 10 efectivo --fecha", "/gasto 10 efectivo --categoria comida --categoria salud",
    '/gasto 10 efectivo --comercio "Sin cerrar', "/gasto 10 efectivo sobrante",
  ])("rejects malformed command %s", (text) => {
    expect(parseTelegramCommand(text, sentAt).kind).toBe("error");
  });
});
