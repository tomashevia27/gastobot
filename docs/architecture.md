# GastoBot — Architecture

## Status

The runtime foundation and the first manual create-expense flow are implemented. Editing and deletion are later slices.

## Initial system

One Next.js application serves the UI and backend. PostgreSQL stores records. There are no microservices or separately deployed API servers.

~~~mermaid
flowchart TD
    UI["Web form and expense list"] --> HTTP["Next.js Route Handlers"]
    HTTP --> App["Expense application operations"]
    App --> Domain["Pure validation and money rules"]
    App --> Store["PostgreSQL persistence via Prisma"]
    Store --> DB["PostgreSQL"]
~~~

Arrows show calls/dependencies in the initial implementation. Validation/domain code never depends on the storage adapter. Database access is infrastructure called by application code.

## Stack

- Next.js App Router and React.
- TypeScript with strict checking.
- npm and a committed lockfile.
- CSS Modules/CSS initially.
- Zod for validating external input.
- PostgreSQL and Prisma for persistence/migrations.
- Vitest for business and integration tests.
- Playwright when the first browser flow exists.
- GitHub Actions for CI configuration.

Exact versions, Prisma configuration and required adapters are selected against the official documentation for the installed stable versions during bootstrap. Do not reuse obsolete generator, lint or ORM setup commands without checking them.

## Target structure

| Path | Responsibility | Created when |
| --- | --- | --- |
| src/app/layout.tsx, page.tsx | App Router entry points | Bootstrap |
| src/app/api/expenses/route.ts | HTTP mapping to application operations | First feature |
| src/modules/expenses/domain/ | Expense concepts, money parsing and validation | First feature |
| src/modules/expenses/application/ | Create/list/summary operations | First feature |
| src/modules/expenses/infrastructure/ | Prisma persistence mapping | First feature |
| src/modules/expenses/ui/ | Expense form/list components | First feature |
| src/server/ | Server-only database client/configuration | First feature or ORM setup as needed |
| prisma/ | ORM configuration and versioned migrations | Bootstrap config; feature migration later |
| tests/integration/ | Tests against dedicated PostgreSQL test DB | First feature |
| tests/e2e/ | Browser user-flow tests | First feature |
| docs/ | Product, architecture, methodology, ADRs, specs | Supplied in this package |
| prompts/ | Reusable development prompts | Supplied in this package |
| .github/workflows/ | CI workflow | Bootstrap |

These are responsibilities, not a demand to create empty folders/classes.
Tests for pure rules can live beside the module implementation.
A port/interface is introduced when it isolates a meaningful persistence/provider boundary, not merely because a folder name suggests one.

## Dependency rules

- UI sends input and renders outcomes; it does not access the database.
- Route Handlers parse/validate transport input and map errors/status codes.
- Application operations implement the feature independently of the HTTP request.
- Domain code represents stable business rules and is framework-independent.
- Persistence maps between domain/DTO values and Prisma/database types.
- Prisma types do not become the public HTTP contract.
- Server Components may call application queries server-side without fetching their own HTTP API.
- Shared request validation does not replace business-rule validation at the application boundary.
- Future Telegram and agent-tool adapters reuse the application operations.

## First feature flow

1. Form submits a JSON request containing amount as a localized string.
2. POST /api/expenses validates shape, enum values, strings and date.
3. Pure money parsing converts the amount string to integer cents exactly.
4. createExpense validates business rules and asks persistence to insert.
5. Prisma maps to PostgreSQL; the expense is stored with server-assigned id/source/timestamps.
6. The backend returns a safe DTO after the insert succeeds.
7. UI updates/refetches the minimal list and current-month total.
8. A failed insert returns a failure and never shows a saved expense.

For this learning project, explicit HTTP endpoints make the boundary visible.
Server Actions are not needed for the first slice. No second API framework is required.

## Initial expense record

| Field | Representation | Notes |
| --- | --- | --- |
| id | UUID / string | Assigned by backend |
| amount_cents | PostgreSQL BIGINT | Positive exact integer |
| currency | ARS | Only supported currency initially |
| occurred_on | PostgreSQL DATE | Civil date, not UTC instant |
| category | Valid category code | UNCATEGORIZED default |
| payment_method | Valid method code | Required |
| merchant | Nullable string | Up to 120 characters |
| description | Nullable string | Up to 500 characters |
| source | MANUAL_WEB | Assigned by backend |
| created_at | UTC timestamp | Assigned by backend |
| updated_at | UTC timestamp | Assigned by backend |

Do not add external_id, reconciliation status or agent memory tables before their features need them.
The local single-user milestone has no user table. Introducing accounts requires an ownership migration and scoping every operation before public/multi-user access.

### Money boundaries

Application cents are validated safe integers. For an initial expense, the maximum is 99,999,999,999 cents (ARS 999,999,999.99), an explicit technical limit. Persistence uses BIGINT because PostgreSQL's ordinary integer is too small.

Prisma BIGINT values are mapped deliberately. Never JSON-serialize a raw bigint or silently cast an arbitrarily large aggregate to number. Aggregate in integers and serialize totals as decimal integer strings where necessary; presentation formatting is separate.

A request never sends a fractional JS number as the monetary source of truth. Exact parsing rules are in the feature spec and ADR 003.

### Dates

Keep occurrence dates as YYYY-MM-DD in transport/domain values. Use an explicit persistence mapping to DATE. Do not derive civil dates by converting local midnight through a timezone and slicing a UTC string.

created_at and updated_at describe instants, independent of the occurrence date.
Current-month ranges use local calendar dates: first day inclusive, next month's first day exclusive.

## Error contract

Use structured application errors:
- validation errors with field-level feedback;
- unexpected persistence/server failures with a generic UI message;
- diagnostic details only in server logs, without tokens or full personal payloads.

POST returns 201 after persistence, 400 for invalid input and 500 for an unexpected server failure.
Do not trust request-supplied ids, source, timestamps or future user identity fields.

## Future boundaries

Messaging channels are inbound adapters. Import providers are outbound/external-data adapters.
The LLM selects structured tools; tools validate and call application operations.

Business data lives in PostgreSQL. Agent preferences and task instructions have separate responsibilities.
One agent is the initial design; no orchestration framework is required before it solves a concrete need.

## Local development and CI

PostgreSQL runs locally via Docker Compose, with a named volume and loopback-only port binding.
Tests use a different database/URL and must never truncate the development database.

The first feature adds domain tests, a migration, isolated integration runs and a browser path. The test PostgreSQL service uses a separate database and temporary storage; commands guard its URL before running.

No network call, secret key or live financial account is needed to build/test the manual expense feature.

## Reference documentation

Checked while preparing this package on 2026-10-06; verify again for installed versions:
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Prisma PostgreSQL connector](https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql)
- [Codex project instructions](https://developers.openai.com/codex/guides/agents-md/)
