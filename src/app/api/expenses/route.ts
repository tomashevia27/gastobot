import { createExpense, ExpenseValidationError, getExpensesSnapshot } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";
import { parseExpenseListQuery } from "@/modules/expenses/domain/list-query";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ errors: { _form: "Enviá un JSON válido." } }, { status: 400 });
  }

  try {
    const expense = await createExpense(input, prismaExpenseStore);
    return Response.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof ExpenseValidationError) {
      return Response.json({ errors: error.fieldErrors }, { status: 400 });
    }
    console.error("Expense creation failed.");
    return Response.json({ error: "No se pudo guardar el gasto. Intentá de nuevo." }, { status: 500 });
  }
}

export async function GET(request: Request = new Request("http://localhost/api/expenses")): Promise<Response> {
  const query = parseExpenseListQuery(new URL(request.url).searchParams);
  if ("errors" in query) return Response.json({ errors: query.errors }, { status: 400 });
  try {
    return Response.json(await getExpensesSnapshot(prismaExpenseStore, new Date(), query));
  } catch {
    console.error("Expense listing failed.");
    return Response.json({ error: "No se pudieron cargar los gastos." }, { status: 500 });
  }
}
