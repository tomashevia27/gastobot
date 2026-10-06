const AMOUNT_PATTERN = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
export const MAX_EXPENSE_CENTS = 99_999_999_999;

export function parseAmountCents(input: string): number {
  const value = input.trim();
  if (!AMOUNT_PATTERN.test(value)) {
    throw new Error("Usá un monto como 8.500,50, sin signo ni símbolo de moneda.");
  }

  const [whole, fraction = ""] = value.replaceAll(".", "").split(",");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0") || "0");
  if (cents < 1n || cents > BigInt(MAX_EXPENSE_CENTS)) {
    throw new Error("El monto debe estar entre $0,01 y $999.999.999,99.");
  }
  return Number(cents);
}

export function formatArsCents(value: number | string): string {
  const cents = BigInt(value);
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `$ ${new Intl.NumberFormat("es-AR").format(whole)},${fraction}`;
}
