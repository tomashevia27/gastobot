# GastoBot — Product

## Problem and user

Tomás currently records expenses in notes or messages to himself. Entries are quick but hard to organize, correct and summarize. GastoBot keeps that low-friction habit and provides a persistent, queryable record.

Initial user: Tomás, using a local application in Argentina.

The project has two objectives: become useful for daily expense tracking and teach modern web development plus agent engineering through incremental delivery.

## Principles

- Fast entry and clear confirmation.
- Exact money handling.
- User control over edits, deletion and uncertain classifications.
- Business records remain queryable without relying on an LLM conversation.
- Channels share the same business operations.
- Unknown information stays unknown; the system asks when required.
- Documentation evolves alongside the implementation.

## v0.1: manual web entry

The milestone includes creating, viewing, editing and deleting manual expenses. These are separate tasks, not one large implementation.

First vertical slice:
1. Enter amount, category, payment method, occurrence date and optional description/merchant.
2. Validate and persist the expense.
3. Show it in a minimal list.
4. Show the total for the current calendar month.
5. Keep it after refresh/restart.

Editing, deletion and month/category filtering with paginated listing are implemented locally. The summary continues to show the current month's total across all categories, regardless of list filters.
Charts and advanced analytics are later features.

## v0.2: ingreso por Telegram

La implementación local admite `/gasto` con monto y medio de pago obligatorios, más categoría, fecha, comercio y descripción opcionales. El bot confirma después de persistir. Solo se aceptan mensajes de texto desde el chat privado del usuario configurado. El comando exacto, errores y garantías ante reintentos están en [la especificación](features/telegram-expense-entry.md). La [guía de configuración](telegram-bot-setup.md) explica cómo crear el bot y poner en marcha el proceso local. La prueba con credenciales reales queda a cargo del usuario.

## Initial rules

- Currency: ARS only.
- Amount: positive, with at most two decimal places.
- Input locale: Argentine; e.g. 8500, 8500,50 or 8.500,50.
- Date: valid civil date, defaulting to today in America/Argentina/Buenos_Aires.
- Category: fixed set initially; defaults to UNCATEGORIZED.
- Payment method: required, explicitly selected.
- Merchant and description: optional.
- Source: MANUAL_WEB, assigned by the backend.
- No authentication or multiple users in this local milestone.
- No conversion or combined totals across different currencies.
- No automated financial advice or LLM dependency in v0.1.

### Categories

| Code | UI label |
| --- | --- |
| FOOD | Comida |
| SUPERMARKET | Supermercado |
| TRANSPORT | Transporte |
| FUEL | Combustible |
| OUTINGS | Salidas |
| EDUCATION | Facultad / educación |
| HEALTH | Salud |
| SERVICES | Servicios |
| OTHER | Otros |
| UNCATEGORIZED | Sin categoría |

### Payment methods

| Code | UI label |
| --- | --- |
| CASH | Efectivo |
| MERCADO_PAGO | Mercado Pago |
| DEBIT | Débito |
| CREDIT | Crédito |
| TRANSFER | Transferencia |
| OTHER | Otro |

MERCADO_PAGO is a payment-method label in v0.1; selecting it does not contact Mercado Pago.

## Domain vocabulary

- Expense: one recorded outflow, the unit counted in expense totals.
- Amount: exact integer number of currency minor units.
- Category: purpose/type of an expense.
- Payment method: how it was paid.
- Merchant: who received the payment.
- Expense source: how the record entered the application.
- Imported transaction: external evidence, not automatically a second expense.
- Reconciliation: linking imported evidence to an existing expense or confirming that it is a new one.
- Agent memory: preferences/rules such as merchant-category mappings.
- Skill: instructions for performing a task.
- Tool: an executable, validated application capability.

## Milestones and later stages

| Stage | Outcome | Prerequisite |
| --- | --- | --- |
| v0.1 Web | Manual creation, listing, editing, deletion | Working local project |
| v0.2 Telegram | Message entry with deterministic commands | Existing expense operations |
| v0.3 Agent | Natural-language entry via structured tools | Tool validation and initial evals |
| v0.4 Dashboard | Charts and comparisons | Reliable stored records |
| v0.5 Memory | Explicit learned preferences | Rules users can inspect/correct |
| v0.6 Import | Import real digital movements | Sample data and provider investigation |
| v0.7 Reconciliation | Avoid double counting across sources | Provenance and matching rules |
| v0.8 Skills/evals | Repeatable agent workflows and regression evaluation | Real examples/failures |
| v0.9 WhatsApp | Second messaging channel | Official channel setup |
| v1.0 Assistant | Queries, budgets and alerts | Reliable tools and access controls |

Evals start with the first agent feature; v0.8 expands them rather than introducing them for the first time.

Mercado Pago API access to all personal consumer purchases is an unverified assumption. Investigate permissions and actual account data before committing to automated synchronization. CSV/report import remains a possible route.

## Future agent example

"ayer 23 lucas cena con los pibes efectivo"

Expected intent: create an ARS 23,000 expense for the previous local date, with an appropriate category, cash payment and a description.

Amount, date and other arguments must be validated by application code before persistence. Missing required information must be clarified. A category can remain UNCATEGORIZED.

Never display an invented confidence percentage as evidence that two records match. Matching scores need a documented method; probabilities need calibration.
