import { currentMonthBounds } from "../domain/dates";
import { validateExpenseInput, type FieldErrors } from "../domain/validation";
import type { ExpenseDto, ExpenseStore, ExpensesSnapshot } from "./types";

export class ExpenseValidationError extends Error {
  constructor(public readonly fieldErrors: FieldErrors) {
    super("Invalid expense input");
  }
}

export async function createExpense(input: unknown, store: ExpenseStore): Promise<ExpenseDto> {
  const validated = validateExpenseInput(input);
  if ("errors" in validated) {
    throw new ExpenseValidationError(validated.errors);
  }
  return store.insert(validated);
}

export async function getExpensesSnapshot(
  store: ExpenseStore,
  now: Date = new Date(),
): Promise<ExpensesSnapshot> {
  const bounds = currentMonthBounds(now);
  const [expenses, currentMonthTotalCents] = await Promise.all([
    store.findAll(),
    store.sumCents(bounds.start, bounds.endExclusive),
  ]);
  return { expenses, month: bounds.month, currentMonthTotalCents };
}
