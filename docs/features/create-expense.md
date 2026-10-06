# Feature — Create a manual expense

Status: Implemented locally; checks and setup are recorded in README.md.
Prerequisite: initialize-project completed.

## User story

As Tomás, I want to record an expense from the web, so that I can keep a durable record and see my month's total.

## Slice scope

A form, validated HTTP operation, application logic, PostgreSQL persistence, minimal list and current-month total. The minimal list/total close the feedback loop for creation; they are not a complete dashboard.

No edit/delete/filtering, charts, authentication, messaging, imports or AI.

## Form contract

| Field | Behaviour |
| --- | --- |
| amount | Required localized ARS string; positive and at most two fractional digits |
| currency | ARS only; fixed in the UI |
| occurredOn | Required YYYY-MM-DD; defaults to today's date in the user's timezone |
| category | Fixed enum; defaults to UNCATEGORIZED |
| paymentMethod | Required valid enum; starts unselected |
| merchant | Optional trimmed string, up to 120 characters |
| description | Optional trimmed string, up to 500 characters |

Codes/labels are defined in docs/product.md.
Blank optional strings become null. Trim surrounding whitespace.
Backend assigns id, source=MANUAL_WEB and timestamps.

### Exact amount grammar

After trimming whitespace:
- Without thousands separators: one or more decimal digits, optionally followed by a comma and one or two decimal digits.
- With thousands separators: the first group has one to three decimal digits; each following period-separated group has exactly three digits; optionally a comma and one or two fractional digits.
- No sign, currency symbol, exponent, trailing separator, embedded spaces or other text.
- Leading zeros are accepted; the positive-value rule still applies.
- One fractional digit is padded to two.
- Validate integer cents: minimum 1, maximum 99,999,999,999.

| Input | Expected |
| --- | --- |
| 8500 | 850000 cents |
| 8.500 | 850000 cents |
| 8500,50 | 850050 cents |
| 8.500,50 | 850050 cents |
| 8,5 | 850 cents |
| 0,01 | 1 cent |
| 999.999.999,99 | 99999999999 cents |
| blank / 0 / -10 | Rejected |
| 1234.56 / 1.23 / 1,234 / 1e3 | Rejected |
| 1.000.000.000 | Rejected: exceeds maximum |

This deliberate locale rule avoids silent alternative interpretations. Display an example near the field.

### Date rules

Validate calendar reality, including leap years. Reject malformed dates such as 2026-02-30.
Default today and current-month range use America/Argentina/Buenos_Aires even when the server runs in UTC.
A valid past or future date is accepted; no additional date restriction is specified.

## HTTP behaviour

- POST /api/expenses accepts only editable form fields; never trusts client-assigned source/id/timestamps.
- Success: 201 with the persisted expense DTO.
- Invalid input: 400 with structured field errors.
- Unexpected server/persistence failure: 500 with generic feedback.
- Queries provide persisted expenses and the current local month total; endpoint shape is explained in the implementation plan.
- Individual amounts cross DTO boundaries as integer cents; bigint/aggregate serialization follows the architecture document.
- PostgreSQL enforces the positive/range constraint in addition to server validation.

## Acceptance criteria

1. Submitting a valid expense inserts it in PostgreSQL.
2. The form shows confirmation only after successful persistence.
3. The saved expense appears immediately or after re-fetch in the minimal list.
4. The record survives page refresh and application restart.
5. Current-month total uses persisted amounts in integer cents and correct civil-date boundaries.
6. A previous-month expense appears in the list but does not increase this month's total.
7. List order is occurredOn descending, then createdAt descending, then id for deterministic ties.
8. The empty state clearly says no expenses exist and shows ARS zero for the month's total.
9. Invalid input gives helpful field feedback and causes no database write.
10. Persistence failure preserves form values, shows no saved confirmation and adds no optimistic ghost record.
11. Submission is disabled while pending to prevent ordinary double-click submission. Full network retry idempotency is deferred; do not claim exactly-once delivery.
12. Required controls have labels and feedback is accessible; keyboard users can submit the form.
13. Server validation holds even when the request bypasses the UI.
14. No raw bigint serialization error or fractional money arithmetic occurs.
15. Domain code does not depend on React, Next.js or Prisma.
16. Setup/migrations/test commands are documented and required CI checks are enabled.

## Verification strategy

### Domain tests, preferably TDD

Exact localized parsing, minimum/maximum, rejection formats, enum validation and real civil dates.
Local today/month boundary examples include an instant shortly after UTC midnight that still belongs to the previous Buenos Aires date.

### Integration tests

Use a dedicated test PostgreSQL database.
Verify insert/readback, server-side rejection without insertion, amount/date round-trip and month totals across boundaries.
Exercise the HTTP-to-application boundary and persistence failure mapping where meaningful.
Do not replace persistence correctness with only a mock repository test.

### Browser test

Create an expense through the form, see it and the total, reload and see the persisted record.
Use isolated test data and never clear the normal development database.

### Required checks

Lint, typecheck, unit tests, integration tests, e2e and build. Document exact commands and CI coverage when implemented.
