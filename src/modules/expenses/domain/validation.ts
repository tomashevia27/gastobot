import { z } from "zod";
import { CATEGORY_CODES, PAYMENT_METHOD_CODES, type Category, type PaymentMethod } from "./constants";
import { isValidCivilDate } from "./dates";
import { parseAmountCents } from "./money";

export type FieldErrors = Record<string, string>;

export type ValidatedExpenseInput = {
  amountCents: number;
  occurredOn: string;
  category: Category;
  paymentMethod: PaymentMethod;
  title: string | null;
  merchant: string | null;
  description: string | null;
};

function validAmount(value: string): boolean {
  try {
    parseAmountCents(value);
    return true;
  } catch {
    return false;
  }
}

const inputSchema = z.strictObject({
  amount: z.string({ error: "Ingresá un monto." }).trim().refine(validAmount, {
    error: "Ingresá un monto válido entre $0,01 y $999.999.999,99. Ejemplo: 8.500,50.",
  }),
  occurredOn: z.string({ error: "Ingresá una fecha." }).refine(isValidCivilDate, {
    error: "Ingresá una fecha real con formato AAAA-MM-DD.",
  }),
  category: z.enum(CATEGORY_CODES, { error: "Elegí una categoría válida." }).default("UNCATEGORIZED"),
  paymentMethod: z.enum(PAYMENT_METHOD_CODES, { error: "Elegí un medio de pago." }),
  title: z.string().trim().max(120, "El título admite hasta 120 caracteres.").optional(),
  merchant: z.string().trim().max(120, "El comercio admite hasta 120 caracteres.").optional(),
  description: z.string().trim().max(500, "La descripción admite hasta 500 caracteres.").optional(),
});

export function validateExpenseInput(input: unknown): ValidatedExpenseInput | { errors: FieldErrors } {
  const result = inputSchema.safeParse(input);
  if (!result.success) {
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString() ?? "_form";
      errors[field] ??= issue.message;
    }
    return { errors };
  }

  const value = result.data;
  return {
    amountCents: parseAmountCents(value.amount),
    occurredOn: value.occurredOn,
    category: value.category,
    paymentMethod: value.paymentMethod,
    title: value.title || null,
    merchant: value.merchant || null,
    description: value.description || null,
  };
}
