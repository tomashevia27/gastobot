# Feature — Initialize the local project

## Goal

Turn the supplied documentation into a runnable, verifiable development foundation without implementing expense behaviour.

## Scope

- Inspect existing files, Git state and installed Node.js/npm/Docker.
- Initialize Git with main only if this directory is not already in a repository.
- If it belongs to an ancestor repository, report that situation instead of silently creating a nested repository.
- Create Next.js App Router with src/, strict TypeScript and npm.
- Preserve supplied documentation. A scaffold may need to be generated in a temporary directory because the project root is non-empty.
- Add a minimal Spanish GastoBot page, with no simulated financial data.
- Configure ESLint, typecheck, build and Vitest single-run commands.
- Add PostgreSQL Compose config with local-only binding and a persistent named volume.
- Set up Prisma configuration compatible with the selected version; do not invent expense tables yet.
- Add a sanitized .env.example and ignore real env files/build/dependency output.
- Record an exact supported Node.js version and dependency lockfile.
- Configure GitHub Actions for push/PR to main, using compatible runtime/tool versions and npm ci.
- Update README with commands, setup and checks actually performed.
- Finish by planning create-expense, without implementing it.

## Non-goals

No expense CRUD, seed expenses, agent, Telegram, Mercado Pago, OAuth, auth, public deployment, remote repository creation or push.

## Acceptance criteria

1. Existing documentation survives intact except necessary, explained consistency/setup updates.
2. The development server renders a minimal page at localhost.
3. Lint, typecheck and build execute successfully, or genuine blockers are reported clearly.
4. A Vitest single-run script exists. If there are no tests, report that explicitly; do not add a tautological test or permanently enable passWithNoTests to claim success.
5. CI runs available lint/typecheck/build checks. During bootstrap it can explicitly omit the empty test suite; the first feature adds mandatory tests and removes that omission.
6. PostgreSQL config uses a named volume and loopback binding, and README explains startup/shutdown without deleting the volume.
7. Verify PostgreSQL startup/readiness if Docker is available. If unavailable, distinguish supplied config from verified execution.
8. No business migration is created. Prisma configuration/validation is checked with the installed version where supported.
9. A supported runtime version and package-lock.json are retained.
10. No token or real personal financial record is included.
11. The final report lists changes, exact checks/results, versions, limitations and the plan for the first feature.
12. No feature implementation, remote operation or commit happens outside the prompt's authorization.

## Command contract

Configure:
- npm run dev
- npm run lint
- npm run typecheck
- npm test
- npm run build

Add database/tool commands only if they are valid for the selected versions and needed now.
Integration and e2e scripts are created with the first feature, not fake successful placeholders.

## Verification notes

Build/render must not depend on fetching external fonts or a database connection at build time.
Development database setup is distinct from test setup.
An unavailable dependency/tool is a blocker to report, not evidence that a check passed.
