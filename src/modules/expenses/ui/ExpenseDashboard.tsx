"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { ExpenseDto, ExpensesSnapshot } from "../application/types";
import { CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS, type Category, type PaymentMethod } from "../domain/constants";
import { shiftCivilDate, todayInBuenosAires } from "../domain/dates";
import { DEFAULT_LIST_QUERY, EXPENSE_PAGE_SIZE, type ExpenseListQuery } from "../domain/list-query";
import { formatAmountInput, formatArsCents } from "../domain/money";
import styles from "./ExpenseDashboard.module.css";

type FormValues = {
  amount: string;
  occurredOn: string;
  category: Category;
  paymentMethod: PaymentMethod | "";
  title: string;
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
    title: "",
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenseListQuery>({ ...DEFAULT_LIST_QUERY, month: initialSnapshot.month });
  const [period, setPeriod] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(initialSnapshot.month);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [periodError, setPeriodError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [listMessage, setListMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const requestSequence = useRef(0);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setMessage("");
  }

  const refreshExpenses = useCallback(async function refreshExpenses(query: ExpenseListQuery = filters): Promise<void> {
    const requestNumber = ++requestSequence.current;
    const params = new URLSearchParams();
    if (query.month) params.set("month", query.month);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    if (query.category) params.set("category", query.category);
    if (query.page > 1) params.set("page", String(query.page));
    try {
      const response = await fetch(`/api/expenses${params.size ? `?${params}` : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to refresh expenses.");
      const next = (await response.json()) as ExpensesSnapshot;
      if (requestNumber !== requestSequence.current) return;
      if (next.expenses.length === 0 && query.page > 1 && next.totalCount > 0) {
        const previous = { ...query, page: Math.ceil(next.totalCount / EXPENSE_PAGE_SIZE) };
        setFilters(previous);
        await refreshExpenses(previous);
        return;
      }
      setSnapshot(next);
      setRefreshError("");
    } catch {
      if (requestNumber === requestSequence.current) {
        setRefreshError("No se pudo actualizar la lista. Recargá la página para intentarlo de nuevo.");
      }
    }
  }, [filters]);

  useEffect(() => {
    function refreshIfVisible() {
      if (!document.hidden) void refreshExpenses();
    }

    const interval = window.setInterval(refreshIfVisible, 5_000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refreshExpenses]);

  function changeFilters(next: ExpenseListQuery) {
    setFilters(next);
    setListMessage("");
    void refreshExpenses(next);
  }

  function selectPeriod(value: string) {
    setPeriod(value);
    setPeriodError("");
    const today = todayInBuenosAires();
    if (value === "custom") return;
    if (value === "month") {
      changeFilters({ ...filters, month: selectedMonth, from: null, to: null, page: 1 });
      return;
    }
    const end = value === "yesterday" ? shiftCivilDate(today, -1) : today;
    const start = value === "week" ? shiftCivilDate(today, -6) : value === "year" ? shiftCivilDate(today, -364) : end;
    changeFilters({ ...filters, month: null, from: start, to: end, page: 1 });
  }

  function applyCustomRange() {
    if (!customFrom || !customTo || customFrom > customTo) {
      setPeriodError("Elegí dos fechas válidas, desde la inicial hasta la final.");
      return;
    }
    setPeriodError("");
    changeFilters({ ...filters, month: null, from: customFrom, to: customTo, page: 1 });
  }

  function beginEdit(expense: ExpenseDto) {
    setDeletingId(null);
    setEditingId(expense.id);
    setForm({
      amount: formatAmountInput(expense.amountCents), occurredOn: expense.occurredOn,
      category: expense.category, paymentMethod: expense.paymentMethod,
      title: expense.title ?? "", merchant: expense.merchant ?? "", description: expense.description ?? "",
    });
    setErrors({});
    setMessage("");
    document.getElementById("amount")?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setMessage("");
  }

  async function confirmDelete(id: string) {
    if (deletePending) return;
    setDeletePending(true);
    setRefreshError("");
    setListMessage("");
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        setRefreshError(body.error ?? "No se pudo eliminar el gasto. Intentá de nuevo.");
        return;
      }
      if (editingId === id) cancelEdit();
      setDeletingId(null);
      setListMessage("Gasto eliminado.");
      await refreshExpenses();
    } catch {
      setRefreshError("No se pudo eliminar el gasto. Intentá de nuevo.");
    } finally {
      setDeletePending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});
    setMessage("");
    setRefreshError("");
    const wasEditing = editingId !== null;
    try {
      const response = await fetch(wasEditing ? `/api/expenses/${editingId}` : "/api/expenses", {
        method: wasEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json() as { errors?: FieldErrors; error?: string };
      if (response.status === 400) {
        setErrors(body.errors ?? { _form: "Revisá los datos del gasto." });
        return;
      }
      if (!response.ok) {
        setErrors({ _form: body.error ?? (wasEditing ? "No se pudo actualizar el gasto." : "No se pudo guardar el gasto.") });
        return;
      }
      setMessage(wasEditing ? "Gasto actualizado." : "Gasto guardado.");
      setEditingId(null);
      setForm(emptyForm());
      await refreshExpenses();
    } catch {
      setErrors({ _form: wasEditing ? "No se pudo actualizar el gasto. Intentá de nuevo." : "No se pudo guardar el gasto. Intentá de nuevo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandBar}>
          <div className={styles.brandLockup}>
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M12 8h24v31l-4-3-4 3-4-3-4 3-4-3-4 3V8Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="24" cy="18" r="4" fill="currentColor" />
                <path d="M18 28h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className={styles.brandName}>GastoBot<span>Tu cuaderno de gastos</span></span>
          </div>
          <span className={styles.brandAside}>HECHO PARA TUS DÍAS</span>
        </div>
        <div className={styles.heroContent}>
          <div>
            <p className={styles.eyebrow}>UN POCO MÁS DE CLARIDAD, TODOS LOS DÍAS</p>
            <h1>Tus gastos, <em>a mano.</em></h1>
            <p className={styles.heroDescription}>Anotá en segundos. Después volvé a mirar con calma en qué se fue la plata.</p>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <span className={styles.heroSun} />
            <div className={styles.heroReceipt}>
              <span className={styles.heroReceiptDot} />
              <span className={styles.heroReceiptLine} />
              <span className={styles.heroReceiptLine} />
              <span className={styles.heroReceiptShort} />
            </div>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="new-expense-title">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>01</span>
            <div><p>REGISTRO</p><h2 id="new-expense-title">{editingId ? "Editar gasto" : "Anotá un gasto"}</h2></div>
          </div>
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
              <label htmlFor="title">Título <span className={styles.optional}>(opcional)</span></label>
              <input id="title" name="title" type="text" maxLength={120} value={form.title}
                onChange={(event) => update("title", event.target.value)}
                aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} />
              {errors.title && <span id="title-error" className={styles.error}>{errors.title}</span>}
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
            <button type="submit" disabled={pending}>{pending ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar gasto"}</button>
            {editingId && <button type="button" className={styles.secondaryButton} disabled={pending} onClick={cancelEdit}>Cancelar edición</button>}
          </form>
        </section>

        <section className={styles.overview} aria-label="Resumen y gastos">
          <div className={styles.filterCard}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>02</span>
              <div><p>EXPLORAR</p><h2>Encontrá tus números</h2></div>
            </div>
            <p className={styles.filterIntro}>Elegí un período y una categoría. El total y la lista se acomodan a tu selección.</p>
            <div className={styles.filters}>
              <div className={styles.field}>
                <label htmlFor="filter-period">Período</label>
                <select id="filter-period" value={period} onChange={(event) => selectPeriod(event.target.value)}>
                  <option value="month">Mes</option>
                  <option value="yesterday">Ayer</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="year">Últimos 365 días</option>
                  <option value="custom">Elegir fechas</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="filter-category">Filtrar por categoría</label>
                <select id="filter-category" value={filters.category ?? ""} disabled={pending || deletePending}
                  onChange={(event) => changeFilters({ ...filters, category: (event.target.value || null) as Category | null, page: 1 })}>
                  <option value="">Todas las categorías</option>
                  {CATEGORY_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                </select>
              </div>
            </div>
            {period === "month" && <div className={styles.field}>
              <label htmlFor="filter-month">Mes</label>
              <input id="filter-month" type="month" value={selectedMonth} onChange={(event) => {
                setSelectedMonth(event.target.value);
                if (event.target.value) changeFilters({ ...filters, month: event.target.value, from: null, to: null, page: 1 });
              }} />
            </div>}
            {period === "custom" && <div className={styles.customRange}>
              <div className={styles.field}><label htmlFor="filter-from">Desde</label><input id="filter-from" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></div>
              <div className={styles.field}><label htmlFor="filter-to">Hasta</label><input id="filter-to" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></div>
              <button type="button" onClick={applyCustomRange}>Aplicar fechas</button>
            </div>}
            {periodError && <p className={styles.error} role="alert">{periodError}</p>}
          </div>
          <div className={styles.totalCard}>
            <p className={styles.totalEyebrow}>EN ESTE PERÍODO</p>
            <strong>{formatArsCents(snapshot.rangeTotalCents)}</strong>
            <span>{filters.month ? monthLabel(filters.month) : filters.from && filters.to ? `${dateLabel(filters.from)} al ${dateLabel(filters.to)}` : "Todos los días"} · {snapshot.totalCount} {snapshot.totalCount === 1 ? "gasto" : "gastos"} en el rango</span>
          </div>
          <div className={styles.panel}>
            <div className={styles.listHeading}>
              <div><p>MOVIMIENTOS</p><h2>Lo que anotaste</h2></div>
              <span>{snapshot.totalCount}</span>
            </div>
            {refreshError && <p className={styles.error} role="alert">{refreshError}</p>}
            {listMessage && <p className={styles.success} role="status">{listMessage}</p>}
            {snapshot.expenses.length === 0 ? (
              <div className={styles.empty}><span aria-hidden="true">✳</span><p>Por acá todavía no hay gastos. Probá con otro período o anotá uno nuevo.</p></div>
            ) : (
              <ul className={styles.list}>
                {snapshot.expenses.map((expense) => (
                  <li key={expense.id} className={styles.item} data-category={expense.category}>
                    <span className={styles.itemIcon} aria-hidden="true">{categoryLabel(expense.category).slice(0, 1)}</span>
                    <div className={styles.itemMain}>
                      <strong>{expense.title || expense.merchant || categoryLabel(expense.category)}</strong>
                      <p>{categoryLabel(expense.category)} · {paymentLabel(expense.paymentMethod)} · {dateLabel(expense.occurredOn)}</p>
                      {expense.title && expense.merchant && <p>Comercio: {expense.merchant}</p>}
                      {expense.description && <p>{expense.description}</p>}
                    </div>
                    <div className={styles.itemSide}>
                      <span className={styles.amount}>{formatArsCents(expense.amountCents)}</span>
                      <div className={styles.actions}>
                        <button type="button" onClick={() => beginEdit(expense)} disabled={pending || deletePending}>Editar</button>
                        <button type="button" onClick={() => { setDeletingId(expense.id); setListMessage(""); }} disabled={pending || deletePending}>Eliminar</button>
                      </div>
                      {deletingId === expense.id && (
                        <div className={styles.confirm}>
                          <p>¿Eliminar este gasto definitivamente?</p>
                          <button type="button" className={styles.dangerButton} disabled={deletePending} onClick={() => void confirmDelete(expense.id)}>Confirmar eliminación</button>
                          <button type="button" className={styles.secondaryButton} disabled={deletePending} onClick={() => setDeletingId(null)}>Cancelar eliminación</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {snapshot.totalCount > EXPENSE_PAGE_SIZE && (
              <div className={styles.pagination}>
                <button type="button" disabled={filters.page === 1} onClick={() => changeFilters({ ...filters, page: filters.page - 1 })}>Anterior</button>
                <span>Página {snapshot.page}</span>
                <button type="button" disabled={!snapshot.hasMore} onClick={() => changeFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
