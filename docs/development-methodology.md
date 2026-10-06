# GastoBot — Development Methodology

## 1. Objective

GastoBot will be developed incrementally as both:

1. A useful personal finance application.
2. A learning project for modern web development and AI agent engineering.

The priority is not to generate the maximum amount of code quickly.
The priority is to understand, verify and incrementally evolve the system.

## 2. Engineering principles

### 2.1 Small batches

Development must happen through small, independently verifiable changes.
Each development task should ideally be completable in a few hours rather than several days.

A task should have:
- a clear goal;
- explicit scope;
- acceptance criteria;
- tests or a verification strategy;
- a small and reviewable diff.

Avoid large changes such as "Implement the entire Telegram integration".

Prefer:
1. Add an HTTP endpoint capable of receiving and validating a Telegram webhook payload.
2. Extract the text message from an accepted Telegram webhook.
3. Convert a Telegram message into a CreateExpense command.

These infrastructure increments support a complete user-facing slice; they are not a reason to build every adapter before delivering useful behaviour.

### 2.2 Vertical slices

Features should preferably be developed end-to-end instead of completing entire architectural layers first.

Instead of:
1. Build all database repositories.
2. Build all services.
3. Build all controllers.
4. Build the whole frontend.

Prefer:
- Slice 1: user can create one expense, including form, HTTP boundary, validation, application logic, persistence and automated tests.
- Slice 2: user can list expenses with richer filtering/navigation.
- Slice 3: user can edit an expense.
- Slice 4: user can delete an expense.

Each slice leaves the application in a working state.
For GastoBot's first slice, a minimal list and current-month total are part of the creation feedback loop. Full listing/filtering and a dashboard remain separate work.

## 3. Architecture philosophy

The architecture is evolutionary.

Do not design infrastructure for hypothetical future requirements.
Architectural complexity must be justified by an existing requirement or by a clearly imminent one.
The initial architecture will be a modular monolith.

One Next.js application hosts presentation and application operations. Domain rules remain framework-independent; persistence is infrastructure used by application code. See docs/architecture.md for the concrete dependencies.

External systems will be treated as adapters:
- Telegram;
- Mercado Pago;
- PostgreSQL;
- LLM provider;
- WhatsApp.

The domain must not depend directly on those systems.

## 4. Domain-Driven Design

DDD will be used pragmatically.
Its purpose is to model the problem clearly, not to maximize the number of abstractions.

The initial domain language includes:
- Expense;
- Amount;
- Currency;
- Category;
- Merchant;
- Payment Method;
- Expense Source;
- Transaction;
- Imported Transaction;
- Reconciliation.

These terms should be used consistently in code, database, UI, documentation and tests.
English identifiers may have consistent Spanish UI labels.

Avoid generic names such as Data, Manager, Helper, Processor, Item or Utils when a precise domain concept exists.

Future domain vocabulary is not a mandate to implement all those models in v0.1.

## 5. Hexagonal architecture

Hexagonal architecture will be introduced at system boundaries where it provides useful isolation.

~~~mermaid
flowchart TD
    Web["Web adapter"] --> App["Expense application"]
    Telegram["Telegram adapter"] --> App
    App --> Port["ExpenseStore port"]
    PG["PostgreSQL adapter"] -. "implements" .-> Port
~~~

This illustrates a possible persistence port, not a requirement to create it before it provides value. Inbound adapters invoke application capabilities; outbound adapters implement capabilities the application needs.

The application should depend on abstractions representing capabilities when they isolate a meaningful boundary.
Infrastructure adapters implement those capabilities.

Interfaces must not be created only for theoretical flexibility.
Create a port when there is a meaningful boundary. External transaction import can introduce a TransactionSource capability when that feature exists.

## 6. Testing strategy

Testing will use different techniques depending on the problem.

### Domain logic

Prefer TDD where business rules exist:
RED → GREEN → REFACTOR.

Examples:
- expense validation;
- amount handling;
- categorization rules;
- duplicate detection;
- reconciliation scoring.

Write the failing test for the intended rule, implement the smallest valid behaviour and refactor while keeping tests green.

### Infrastructure

Use integration tests for:
- database repositories/persistence operations;
- HTTP routes;
- external API adapters;
- webhook parsing.

Mock external services only at meaningful boundaries. Verify persistence against a real isolated test database. No automated test may clear the normal development database.

### UI

Test important user behaviour.
Avoid testing trivial implementation details.

Prefer "User can create an expense" over "React component has a state variable called amount".
Do not use TDD for a trivial spacing or styling change.

### Inside-out and acceptance

Choose the slice from observable user behaviour, then use inside-out TDD for its important domain rules.
Connect that logic to persistence/HTTP and the UI, and verify the complete flow.
Inside-out implementation and vertical-slice delivery solve different problems and can be used together.

## 7. AI behaviour

LLM behaviour must not be treated as deterministic business logic.

For example, "gasté 15 lucas en una pizza ayer" may be interpreted by an agent.
But the actual creation of the expense must happen through deterministic application code.

~~~mermaid
flowchart TD
    Text["User text"] --> Agent["Agent"]
    Agent --> Tool["Structured tool call"]
    Tool --> Validate["Validation"]
    Validate --> App["Application operation"]
    App --> Rules["Domain rules"]
    App --> DB["Persistence"]
~~~

The LLM must never directly modify the database or execute arbitrary SQL.

Keep user/account identity out of model-selected arguments; trusted execution context determines ownership when accounts are added.
Unknown required data must not be invented.

## 8. Tools

Agent tools are application capabilities exposed to the model.

Examples:
- create_expense;
- update_expense;
- search_expenses;
- delete_expense;
- get_spending_summary.

Tools must:
- have explicit schemas;
- validate input;
- perform one clear operation;
- return structured results;
- contain deterministic behaviour whenever possible.

Permission, ownership and business validation belong in trusted code, not only in prompts.
Tools reuse application operations; they do not introduce a separate parallel implementation of expense logic.

## 9. AI evaluations

Agent behaviour requires evals in addition to traditional tests.

Example:

~~~text
Input:
"gasté 8500 en YPF"

Expected:
amount = 8500 pesos (850000 integer cents when calling the expense operation)
merchant = YPF
category = FUEL
~~~

Another:

~~~text
Input:
"ayer pagué 18 lucas de cena en efectivo"

Expected:
amount = 18000 pesos
paymentMethod = CASH
date = yesterday in the user's timezone
~~~

Evaluation datasets will grow from real failures discovered while using the application.
A regression discovered in production should become either a traditional automated test or an agent eval.

Start evals with the first agent feature. Include ambiguous input, missing required data, invalid tool arguments, date boundaries and duplicate/retry cases. Fix reference dates/context for reproducible examples.

Measure structured fields and selected operations against expected behaviour. Record model/prompt/tool versions, cost and latency when those features are introduced.
Passing an eval dataset is evidence within that dataset, not a guarantee of universal correctness.

## 10. Git workflow

Use trunk-based development.
Primary branch: main.

Work should happen through very short-lived branches when isolation or review is useful.
Example: feature/create-expense.

Expected lifecycle:
main → small branch → implementation → tests → review → merge.

Branches should normally live for hours rather than weeks.
Avoid long-lived develop, integration or release-next branches unless the project later develops a real need for them.

Initializing Git locally is separate from creating a GitHub repository.
A remote, push or deployment is performed only when requested. Do not overwrite an existing repository or silently create a nested one.

## 11. Continuous Integration

Every change merged into main must leave the repository healthy.

CI should run:
~~~bash
npm run lint
npm run typecheck
npm test
npm run build
~~~

Persistence features add mandatory isolated integration verification; the first UI flow adds an e2e check.
A failing main branch has priority over new development.

During documentation/bootstrap, business tests do not exist yet. State that clearly and configure the runner without inventing test coverage. CI may explicitly omit an empty suite during bootstrap; the first feature makes its real tests required.

The CI definition being created locally does not mean GitHub has executed it.
Report local checks separately from remote CI results.

## 12. Commits

Commits should be small and cohesive.
A commit should represent one understandable change.

Examples:
~~~text
feat: add expense creation use case
test: validate negative expense amounts
feat: persist expenses with postgres
fix: reject malformed telegram messages
~~~

Do not create commits containing unrelated changes.
Review the diff and protect pre-existing uncommitted work.
Commit only when the active task authorizes it; otherwise provide a suggested message and reviewable changes.

## 13. Development workflow with Codex

Codex is treated as an engineering collaborator, not as an automatic code generator.

For any non-trivial task:

### Step 1 — Define the task

Describe the change similarly to a GitHub issue.
Include context, desired behaviour, scope, non-goals and acceptance criteria.

### Step 2 — Ask for a plan

Before modifying code, Codex should:
1. inspect the relevant code;
2. identify affected components;
3. propose an implementation plan;
4. identify risks or assumptions.

For sufficiently small tasks this step may be implicit.

### Step 3 — Review the plan

The developer verifies:
- whether the solution fits the architecture;
- whether unnecessary abstractions are being introduced;
- whether the scope remains small.

A plan-only request ends at this step.
An explicit request to implement an already scoped task authorizes that task; the agent can explain its plan and proceed without demanding a second approval for routine steps.

The initial bootstrap prompt provides that authorization for initialize-project only. It requests a plan, not implementation, for create-expense.

### Step 4 — Implement

Codex implements only the approved task.
It should not automatically implement adjacent features.

### Step 5 — Verify

Codex must run relevant tests, type checker, linter and build.
Passing verification is part of the definition of done.
Report commands actually run, outcomes and unavailable checks; do not describe a blocked check as passing.

### Step 6 — Human review

The developer reviews the diff and should be able to explain:
- what changed;
- why it changed;
- how data flows through the feature;
- which tests verify it;
- what architectural decisions were introduced.

Code that cannot be understood should not be merged merely because it works.

### Step 7 — Commit

Create a small cohesive commit when authorized.
Then continue with the next task.

## 14. Context engineering

Persistent information should be placed in the appropriate artifact.

| Artifact | Purpose |
| --- | --- |
| README.md | Project introduction, actual state, setup and run instructions |
| AGENTS.md | Concise operational instructions, architecture rules, commands and completion criteria |
| docs/product.md | Problem, users, product principles and feature requirements |
| docs/architecture.md | Modules, dependencies, external systems and major design choices |
| docs/decisions/ | Short ADRs recording context, decision and consequences |
| docs/features/ | Specifications for non-trivial features |
| prompts/ | Reusable task prompts that refer to repository context |

Keep AGENTS.md concise. It is not a copy of this entire methodology.

ADR examples:
- 001-modular-monolith.md;
- 002-telegram-before-whatsapp.md;
- 003-money-as-integer.md.

Feature examples:
- create-expense.md;
- telegram-expense-entry.md, when that work begins;
- mercadopago-import.md, after provider/data investigation.

Document actual decisions and behaviours. Distinguish implemented features, current tasks and roadmap ideas.
Do not create a large harness or speculative future specs before they solve a concrete problem.

## 15. Definition of Done

A task is complete when:
- acceptance criteria are satisfied;
- relevant automated tests pass;
- type checking passes;
- lint passes;
- the application builds;
- architecture remains consistent;
- documentation is updated when necessary;
- no unrelated changes are included;
- the developer understands the resulting implementation.

For AI features, relevant evals must also pass.

Apply the checks that exist and are relevant to the task. Markdown-only changes require link/consistency verification, not a nonexistent app build.
For bootstrap and blocked environments, report what was verified and what remains outstanding; a limitation is not silently waived.
No merge is justified by unsupported claims of success.

## 16. Avoid premature complexity

Do not introduce technologies only because they may eventually be useful.

Initially avoid:
- microservices;
- event buses;
- Kubernetes;
- Redis;
- vector databases;
- multiple AI agents;
- CQRS;
- event sourcing;
- complex repository abstractions;
- generic plugin frameworks.

Introduce them only when a concrete problem justifies them.

## 17. Guiding principle

Prefer simple, observable, testable, replaceable and understandable software.
Do not optimize for cleverness, genericity, promises of being future-proof or abstraction counts.

The system should become more sophisticated only as the problems it solves become more sophisticated.

This file adapts the methodology discussed and edited with Tomás into repository documentation. Project-specific details resolve ambiguities without changing its incremental development philosophy.
