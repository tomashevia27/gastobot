# ADR 003 — Money as integer cents

Status: Accepted.
Date: 2026-10-06.

## Context

Binary floating-point arithmetic can introduce errors in decimal money calculations. The UI uses pesos and Argentine formatting; storage must be exact.

PostgreSQL INTEGER is too small for the intended monetary range. Prisma/database integer representations also need an explicit serialization boundary.

## Decision

- v0.1 supports ARS only.
- Parse the UI amount from a string; convert whole and fractional decimal digits to integer cents without parseFloat(amount) * 100.
- Store cents as PostgreSQL BIGINT.
- Validate an individual expense between 1 and 99,999,999,999 cents.
- Application number values must pass safe-integer checks.
- Map database bigint explicitly; DTO aggregate amounts can be decimal integer strings.
- Sum integer minor units; do not round fractional floats as a repair strategy.
- Format ARS for presentation separately from validation and storage.

Accepted localized input includes 8500, 8500,50 and 8.500,50.
A period is a thousands separator, not a decimal separator.
Reject malformed/ambiguous formats rather than interpreting 1234.56 as a different amount.
See the feature spec for precise valid/invalid examples.

## Consequences

The model preserves exact amounts and avoids cents overflow in PostgreSQL.
BigInt cannot be passed directly through JSON; mapping is part of the adapter.
Multiple currencies and conversions need a future specification.
