import { describe, expect, it } from "vitest";
import { parseTelegramCommand } from "./command";

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

  it.each(["/start", "/ayuda", "/help"])("answers %s with help", (text) => {
    expect(parseTelegramCommand(text, sentAt)).toEqual({ kind: "help" });
  });

  it.each([
    "/gasto", "/gasto 10 paypal", "/gasto 10 efectivo --categoria viajes",
    "/gasto 10 efectivo --fecha", "/gasto 10 efectivo --categoria comida --categoria salud",
    '/gasto 10 efectivo --comercio "Sin cerrar', "/gasto 10 efectivo sobrante",
  ])("rejects malformed command %s", (text) => {
    expect(parseTelegramCommand(text, sentAt).kind).toBe("error");
  });
});
