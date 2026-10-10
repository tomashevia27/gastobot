import { isValidCivilDate } from "@/modules/expenses/domain/dates";

const WRITTEN_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseWrittenDate(text: string): string | null {
  const match = WRITTEN_DATE_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const civilDate = `${year}-${month}-${day}`;
  return isValidCivilDate(civilDate) ? civilDate : null;
}

export function formatWrittenDate(civilDate: string): string {
  const [year, month, day] = civilDate.split("-");
  return `${day}/${month}/${year}`;
}
