import { CATEGORY_CODES, type Category } from "./constants";
import { isValidCivilDate } from "./dates";
import type { FieldErrors } from "./validation";

export type ExpenseListQuery = { month: string | null; from: string | null; to: string | null; category: Category | null; page: number };

export const DEFAULT_LIST_QUERY: ExpenseListQuery = { month: null, from: null, to: null, category: null, page: 1 };
export const EXPENSE_PAGE_SIZE = 20;

export function parseExpenseListQuery(params: URLSearchParams): ExpenseListQuery | { errors: FieldErrors } {
  const errors: FieldErrors = {};
  for (const key of params.keys()) {
    if (!["month", "from", "to", "category", "page"].includes(key)) errors._form = "Parámetro de búsqueda desconocido.";
    if (params.getAll(key).length > 1) errors[key] = "Elegí un solo valor.";
  }

  const month = params.get("month");
  if (month !== null && (!/^\d{4}-\d{2}$/.test(month) || !isValidCivilDate(`${month}-01`))) {
    errors.month = "Elegí un mes válido.";
  }

  const from = params.get("from");
  const to = params.get("to");
  if ((from === null) !== (to === null)) errors.from = "Indicá ambas fechas del rango.";
  if (from !== null && !isValidCivilDate(from)) errors.from = "Elegí una fecha inicial válida.";
  if (to !== null && !isValidCivilDate(to)) errors.to = "Elegí una fecha final válida.";
  if (from && to && from > to) errors.to = "La fecha final debe ser igual o posterior a la inicial.";
  if (month !== null && from !== null) errors.month = "Elegí un mes o un rango de fechas.";

  const category = params.get("category");
  if (category !== null && !CATEGORY_CODES.some((code) => code === category)) {
    errors.category = "Elegí una categoría válida.";
  }

  const pageValue = params.get("page");
  if (pageValue !== null && (!/^[1-9]\d*$/.test(pageValue) || Number(pageValue) > 10_000)) {
    errors.page = "Elegí una página válida.";
  }

  if (Object.keys(errors).length) return { errors };
  return {
    month,
    from,
    to,
    category: category as Category | null,
    page: pageValue === null ? 1 : Number(pageValue),
  };
}
