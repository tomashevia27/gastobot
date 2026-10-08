import { currentMonthBounds } from "../domain/dates";
import { validateExpenseInput, type FieldErrors } from "../domain/validation";
import { DEFAULT_LIST_QUERY, EXPENSE_PAGE_SIZE, type ExpenseListQuery } from "../domain/list-query";
import type { ExpenseDto, ExpenseStore, ExpensesSnapshot } from "./types";

export class ExpenseValidationError extends Error {
  constructor(public readonly fieldErrors: FieldErrors) {
    super("Invalid expense input");
  }
}

export class ExpenseNotFoundError extends Error {
  constructor() {
    super("Expense not found");
  }
}

function validExpenseId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function createExpense(input: unknown, store: ExpenseStore): Promise<ExpenseDto> {
  const validated = validateExpenseInput(input);
  if ("errors" in validated) {
    throw new ExpenseValidationError(validated.errors);
  }
  return store.insert(validated);
}

export async function updateExpense(id: string, input: unknown, store: ExpenseStore): Promise<ExpenseDto> {
  if (!validExpenseId(id)) throw new ExpenseNotFoundError();
  const validated = validateExpenseInput(input);
  if ("errors" in validated) throw new ExpenseValidationError(validated.errors);
  const updated = await store.update(id, validated);
  if (!updated) throw new ExpenseNotFoundError();
  return updated;
}

export async function deleteExpense(id: string, store: ExpenseStore): Promise<void> {
  if (!validExpenseId(id) || !(await store.delete(id))) throw new ExpenseNotFoundError();
}

export async function getExpensesSnapshot(
  store: ExpenseStore,
  now: Date = new Date(),
  query: ExpenseListQuery = DEFAULT_LIST_QUERY,
): Promise<ExpensesSnapshot> {
  const bounds = currentMonthBounds(now);
  const [{ expenses, totalCount }, currentMonthTotalCents] = await Promise.all([
    store.findPage(query),
    store.sumCents(bounds.start, bounds.endExclusive),
  ]);
  return {
    expenses, month: bounds.month, currentMonthTotalCents,
    page: query.page, totalCount,
    hasMore: query.page * EXPENSE_PAGE_SIZE < totalCount,
  };
}
