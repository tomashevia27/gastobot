import { getExpensesSnapshot } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import { ExpenseDashboard } from "@/modules/expenses/ui/ExpenseDashboard";
import { currentMonthBounds } from "@/modules/expenses/domain/dates";
import { DEFAULT_LIST_QUERY } from "@/modules/expenses/domain/list-query";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const initialSnapshot = await getExpensesSnapshot(prismaExpenseStore, now, { ...DEFAULT_LIST_QUERY, month: currentMonthBounds(now).month });
  return <ExpenseDashboard initialSnapshot={initialSnapshot} />;
}
