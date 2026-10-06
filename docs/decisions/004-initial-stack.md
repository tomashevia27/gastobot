# ADR 004 — Initial stack

Status: Accepted and verified for the local bootstrap.
Date: 2026-10-06.

## Context

Tomás knows programming fundamentals and wants to learn the complete web path and, later, real agent tools. Using one language for frontend/backend keeps the initial toolchain focused.

## Decision

Use:
- Next.js App Router and React for web/backend entry points.
- TypeScript strict for application code.
- npm with package-lock.json.
- PostgreSQL for durable relational records.
- Prisma for database access and versioned migrations.
- Zod for external-input validation.
- CSS Modules/CSS initially.
- Vitest for domain/integration tests.
- Playwright when the first complete browser flow exists.
- Docker Compose for local PostgreSQL.
- GitHub Actions for CI.

Use Route Handlers for the first HTTP write boundary; application functions remain reusable.
Selected on 2026-10-06: Node.js 24.15.0, npm 11.12.1, Next.js 16.3.8, React 19.3.0, TypeScript 5.9.3, PostgreSQL 17.11, Prisma 7.10.0 with `@prisma/adapter-pg` and `pg`, Zod 4.6.5, Vitest 5.0.3, and ESLint 9.39.5. Exact npm dependencies are in `package.json` and the lockfile. TypeScript 6 and ESLint 10 failed the selected Next build/lint integration during bootstrap.

## Consequences

One application, one language for feature code, explicit SQL persistence and an inspectable HTTP flow.
There is an ORM to learn. The selected versions were compatibility-checked during bootstrap; repeat that check when updating the stack.
This is an educational/project choice, not a claim that the stack is universally dominant.
No LLM SDK, agent framework or UI component framework is needed yet.
