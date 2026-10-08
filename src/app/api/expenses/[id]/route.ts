import { ExpenseNotFoundError, ExpenseValidationError, updateExpense } from "@/modules/expenses/application/operations";
import { prismaExpenseStore } from "@/modules/expenses/infrastructure/prisma-expense-store";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context): Promise<Response> {
  const { id } = await context.params;
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ errors: { _form: "Enviá un JSON válido." } }, { status: 400 });
  }

  try {
    return Response.json(await updateExpense(id, input, prismaExpenseStore));
  } catch (error) {
    if (error instanceof ExpenseValidationError) return Response.json({ errors: error.fieldErrors }, { status: 400 });
    if (error instanceof ExpenseNotFoundError) return Response.json({ error: "No se encontró el gasto." }, { status: 404 });
    console.error("Expense update failed.");
    return Response.json({ error: "No se pudo actualizar el gasto. Intentá de nuevo." }, { status: 500 });
  }
}
