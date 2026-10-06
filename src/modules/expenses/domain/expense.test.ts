import { describe, expect, it } from "vitest";
import { currentMonthBounds, isValidCivilDate, todayInBuenosAires } from "./dates";
import { parseAmountCents } from "./money";
import { validateExpenseInput } from "./validation";

describe("ARS amount parsing", () => {
  it.each([
    ["8500", 850000],
    ["8.500", 850000],
    ["8500,50", 850050],
    ["8.500,50", 850050],
    ["8,5", 850],
    ["0,01", 1],
    ["999.999.999,99", 99999999999],
    ["  0008,5  ", 850],
  ])("converts %s to %i integer cents", (input, expected) => {
    expect(parseAmountCents(input)).toBe(expected);
  });

  it.each(["", " ", "0", "0,00", "-10", "1234.56", "1.23", "1,234", "1e3", "1,", "1.", "1 000", "$ 10", "1.000.000.000"])(
    "rejects %s",
    (input) => {
      expect(() => parseAmountCents(input)).toThrow();
    },
  );
});

describe("civil dates in Buenos Aires", () => {
  it.each(["2024-02-29", "2026-10-06", "0001-01-01", "9999-12-31"])("accepts %s", (date) => {
    expect(isValidCivilDate(date)).toBe(true);
  });

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-00-01", "2026-1-01", "0000-01-01"])(
    "rejects %s",
    (date) => {
      expect(isValidCivilDate(date)).toBe(false);
    },
  );

  it("uses the previous local day and month shortly after UTC midnight", () => {
    const instant = new Date("2026-10-01T00:30:00.000Z");
    expect(todayInBuenosAires(instant)).toBe("2026-09-30");
    expect(currentMonthBounds(instant)).toEqual({
      month: "2026-09",
      start: "2026-09-01",
      endExclusive: "2026-10-01",
    });
  });

  it("rolls December into January", () => {
    expect(currentMonthBounds(new Date("2027-01-01T00:30:00.000Z"))).toEqual({
      month: "2026-12",
      start: "2026-12-01",
      endExclusive: "2027-01-01",
    });
  });
});

describe("expense input validation", () => {
  const valid = {
    amount: "8.500,50",
    occurredOn: "2026-10-06",
    paymentMethod: "CASH",
  };

  it("normalizes valid editable fields and applies only the category default", () => {
    expect(validateExpenseInput({ ...valid, merchant: "  Kiosco  ", description: "  " })).toEqual({
      amountCents: 850050,
      occurredOn: "2026-10-06",
      category: "UNCATEGORIZED",
      paymentMethod: "CASH",
      merchant: "Kiosco",
      description: null,
    });
  });

  it("requires an explicit valid payment method and a real date", () => {
    const result = validateExpenseInput({
      amount: "0",
      occurredOn: "2026-02-30",
      paymentMethod: "",
    });
    expect(result).toMatchObject({
      errors: {
        amount: expect.any(String),
        occurredOn: expect.any(String),
        paymentMethod: expect.any(String),
      },
    });
  });

  it("rejects an unknown category", () => {
    expect(validateExpenseInput({ ...valid, category: "HOBBIES" })).toMatchObject({
      errors: { category: "Elegí una categoría válida." },
    });
  });

  it("rejects client-controlled and unknown fields", () => {
    expect(validateExpenseInput({ ...valid, source: "MANUAL_WEB" })).toMatchObject({
      errors: { _form: expect.any(String) },
    });
  });

  it("checks trimmed optional lengths", () => {
    expect(validateExpenseInput({ ...valid, merchant: "x".repeat(121), description: "y".repeat(501) })).toMatchObject({
      errors: { merchant: expect.any(String), description: expect.any(String) },
    });
  });
});
