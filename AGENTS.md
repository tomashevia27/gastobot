# GastoBot — Agent instructions

## Context and scope

GastoBot is a personal expense tracker and a learning project.
Current state: local v0.2 supports manual expense management and deterministic Telegram expense entry.
Read the active feature specification before changing code.

Documentation:
- docs/product.md: behaviour and roadmap.
- docs/architecture.md: boundaries and target structure.
- docs/development-methodology.md: workflow and verification.
- docs/decisions/: decisions and consequences.
- docs/features/: acceptance criteria.

## Working agreement

- Explain plans, changes and data flow to Tomás in Spanish; code identifiers are English.
- Inspect the current repository and preserve existing work before editing.
- For non-trivial tasks, outline a short plan with files, flow and verification.
- If asked for a plan only, stop after planning.
- An explicit implementation request authorizes that task. Stay within its scope.
- Prefer small vertical slices; explain material assumptions and new architectural decisions.
- Do not implement roadmap features opportunistically.
- During authorized implementation work, commit each small, coherent increment after its relevant checks pass. Do not push or deploy unless the active request authorizes it.

## Increment and commit workflow

- Divide feature work into small, coherent increments with a specific behaviour or boundary.
- Include implementation, directly related tests and necessary setup or documentation in the same increment. Verify documentation-only changes for consistency; do not add artificial tests.
- Order increments so each proposed commit can stand on its own and pass its relevant checks. Keep coupled code and tests together when separating them would leave a broken intermediate state.
- Review the staged diff and record the checks run for each increment. Do not split work mechanically by file type or directory.
- Tomás authorizes incremental commits during implementation work. A plan-only or review-only request does not authorize commits. Do not rewrite previous commits without an explicit request.

## Stack and boundaries

Next.js App Router, React, strict TypeScript, npm, PostgreSQL, Prisma, Zod,
CSS Modules/CSS and Vitest; Playwright when an end-to-end feature exists.
Check compatible stable versions during bootstrap and retain package-lock.json.
Use a modular monolith organized by feature. Introduce ports when they isolate a real boundary.
Domain rules must not import React, Next.js, Prisma or external-provider SDKs.
Keep transport handlers thin. Application code owns business operations.
Keep database code and secrets server-side; never put them in client bundles.
v0.2 is single-user local use; public/multi-user use requires authentication and ownership checks first.

## Data rules

- Current local milestones use ARS only. Store money as integer cents, never fractional floating-point amounts.
- Parse decimal input from strings with explicit Argentine formatting; validate safe integer ranges.
- PostgreSQL amount_cents is BIGINT. Convert Prisma bigint explicitly at DTO boundaries.
- Occurrence date is a civil YYYY-MM-DD date; timestamps are UTC instants.
- Derive "today" in America/Argentina/Buenos_Aires, not from the server's UTC date.
- Validate on the server even if the UI validates first.
- Do not invent missing payment methods or silently reclassify unknown expenses.
- Preserve the difference between business data, agent memory and skills.
- Future agent tools call validated application operations; the model does not execute arbitrary SQL.

## Verification and completion

Configured commands:
- npm run lint
- npm run typecheck
- npm test (single run of domain tests)
- npm run build
- npm run db:validate
- npm run test:integration (dedicated gastobot_test database)
- npm run test:e2e (Playwright against gastobot_test)

Use TDD for meaningful business rules and integration tests for persistence.
Test user behaviour; avoid tests that mirror code or verify trivial styling.
For each task report changed behaviour, checks actually run, results and blockers.
Do not present unavailable checks or an empty test suite as passing coverage.
Do not hide failed tests, disable checks to force success, or touch real user data in tests.
Update documentation when behaviour/setup changes. Definition of done is in the methodology.

Do not add microservices, Redis, vector storage, event buses, CQRS, event sourcing
or multiple agents without a concrete requirement. No LLM/Telegram/Mercado Pago dependency is needed for the manual expense flow.
