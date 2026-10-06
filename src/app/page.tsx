import { getExpensesSnapshot } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import { ExpenseDashboard } from "@/modules/expenses/ui/ExpenseDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialSnapshot = await getExpensesSnapshot(prismaExpenseStore);
  return <ExpenseDashboard initialSnapshot={initialSnapshot} />;
}
