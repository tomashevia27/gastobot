import type { Category, PaymentMethod } from "../domain/constants";
import type { ValidatedExpenseInput } from "../domain/validation";

export type ExpenseDto = {
  id: string;
  amountCents: number;
  currency: "ARS";
  occurredOn: string;
  category: Category;
  paymentMethod: PaymentMethod;
  merchant: string | null;
  description: string | null;
  source: "MANUAL_WEB";
  createdAt: string;
  updatedAt: string;
};

export type ExpensesSnapshot = {
  expenses: ExpenseDto[];
  month: string;
  currentMonthTotalCents: string;
};

export interface ExpenseStore {
  insert(input: ValidatedExpenseInput): Promise<ExpenseDto>;
  update(id: string, input: ValidatedExpenseInput): Promise<ExpenseDto | null>;
  findAll(): Promise<ExpenseDto[]>;
  sumCents(fromInclusive: string, toExclusive: string): Promise<string>;
}
