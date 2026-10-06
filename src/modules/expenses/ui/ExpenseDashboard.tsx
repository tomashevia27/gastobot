"use client";

import { useState, type FormEvent } from "react";
import type { ExpensesSnapshot } from "../application/types";
import { CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS, type Category, type PaymentMethod } from "../domain/constants";
import { todayInBuenosAires } from "../domain/dates";
import { formatArsCents } from "../domain/money";
import styles from "./ExpenseDashboard.module.css";

type FormValues = {
  amount: string;
  occurredOn: string;
  category: Category;
  paymentMethod: PaymentMethod | "";
  merchant: string;
  description: string;
};

type FieldErrors = Record<string, string>;

function emptyForm(): FormValues {
  return {
    amount: "",
    occurredOn: todayInBuenosAires(),
    category: "UNCATEGORIZED",
    paymentMethod: "",
    merchant: "",
    description: "",
  };
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T12:00:00.000Z`));
}

function dateLabel(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function categoryLabel(code: string): string {
  return CATEGORY_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

function paymentLabel(code: string): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

export function ExpenseDashboard({ initialSnapshot }: { initialSnapshot: ExpensesSnapshot }) {
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setMessage("");
  }

  async function refreshExpenses() {
    try {
      const response = await fetch("/api/expenses", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to refresh expenses.");
      setSnapshot((await response.json()) as ExpensesSnapshot);
      setRefreshError("");
    } catch {
      setRefreshError("No se pudo actualizar la lista. Recargá la página para intentarlo de nuevo.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});
    setMessage("");
    setRefreshError("");
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json() as { errors?: FieldErrors; error?: string };
      if (response.status === 400) {
        setErrors(body.errors ?? { _form: "Revisá los datos del gasto." });
        return;
      }
      if (!response.ok) {
        setErrors({ _form: body.error ?? "No se pudo guardar el gasto. Intentá de nuevo." });
        return;
      }
      setMessage("Gasto guardado.");
      setForm(emptyForm());
      await refreshExpenses();
    } catch {
      setErrors({ _form: "No se pudo guardar el gasto. Intentá de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>GastoBot · Registro personal</p>
        <h1>Tus gastos, claros y al día.</h1>
        <p>Registrá un gasto en pesos y seguí el total del mes actual.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="new-expense-title">
          <h2 id="new-expense-title">Nuevo gasto</h2>
          <form onSubmit={submit} noValidate>
            <div className={styles.field}>
              <label htmlFor="amount">Monto en ARS</label>
              <input id="amount" name="amount" type="text" inputMode="decimal" value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? "amount-help amount-error" : "amount-help"} />
              <span id="amount-help" className={styles.help}>Ejemplo: 8.500,50</span>
              {errors.amount && <span id="amount-error" className={styles.error}>{errors.amount}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="occurredOn">Fecha del gasto</label>
              <input id="occurredOn" name="occurredOn" type="date" value={form.occurredOn}
                onChange={(event) => update("occurredOn", event.target.value)}
                aria-invalid={Boolean(errors.occurredOn)} aria-describedby={errors.occurredOn ? "date-error" : undefined} />
              {errors.occurredOn && <span id="date-error" className={styles.error}>{errors.occurredOn}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="category">Categoría</label>
              <select id="category" name="category" value={form.category}
                onChange={(event) => update("category", event.target.value as Category)}
                aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "category-error" : undefined}>
                {CATEGORY_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
              {errors.category && <span id="category-error" className={styles.error}>{errors.category}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="paymentMethod">Medio de pago</label>
              <select id="paymentMethod" name="paymentMethod" value={form.paymentMethod}
                onChange={(event) => update("paymentMethod", event.target.value as PaymentMethod | "")}
                aria-invalid={Boolean(errors.paymentMethod)}
                aria-describedby={errors.paymentMethod ? "payment-error" : undefined}>
                <option value="">Elegí un medio de pago</option>
                {PAYMENT_METHOD_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
              {errors.paymentMethod && <span id="payment-error" className={styles.error}>{errors.paymentMethod}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="merchant">Comercio <span className={styles.optional}>(opcional)</span></label>
              <input id="merchant" name="merchant" type="text" maxLength={121} value={form.merchant}
                onChange={(event) => update("merchant", event.target.value)}
                aria-invalid={Boolean(errors.merchant)} aria-describedby={errors.merchant ? "merchant-error" : undefined} />
              {errors.merchant && <span id="merchant-error" className={styles.error}>{errors.merchant}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="description">Descripción <span className={styles.optional}>(opcional)</span></label>
              <textarea id="description" name="description" rows={3} maxLength={501} value={form.description}
                onChange={(event) => update("description", event.target.value)}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-error" : undefined} />
              {errors.description && <span id="description-error" className={styles.error}>{errors.description}</span>}
            </div>

            {errors._form && <p className={styles.error} role="alert">{errors._form}</p>}
            {message && <p className={styles.success} role="status">{message}</p>}
            <button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar gasto"}</button>
          </form>
        </section>

        <section className={styles.overview} aria-label="Resumen y gastos">
          <div className={styles.totalCard}>
            <p>Total de {monthLabel(snapshot.month)}</p>
            <strong>{formatArsCents(snapshot.currentMonthTotalCents)}</strong>
          </div>
          <div className={styles.panel}>
            <div className={styles.listHeading}>
              <h2>Gastos registrados</h2>
              <span>{snapshot.expenses.length}</span>
            </div>
            {refreshError && <p className={styles.error} role="alert">{refreshError}</p>}
            {snapshot.expenses.length === 0 ? (
              <p className={styles.empty}>Todavía no hay gastos registrados.</p>
            ) : (
              <ul className={styles.list}>
                {snapshot.expenses.map((expense) => (
                  <li key={expense.id} className={styles.item}>
                    <div>
                      <strong>{expense.merchant || categoryLabel(expense.category)}</strong>
                      <p>{categoryLabel(expense.category)} · {paymentLabel(expense.paymentMethod)} · {dateLabel(expense.occurredOn)}</p>
                      {expense.description && <p>{expense.description}</p>}
                    </div>
                    <span className={styles.amount}>{formatArsCents(expense.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
