# ADR 001 — Modular monolith

Status: Accepted for the initial project direction.
Date: 2026-10-06.

## Context

One developer is learning while building a small personal application. Web entry, messaging and future tools need shared business rules. Independent services would add deployment, networking and coordination work before there is a need.

## Decision

Use one Next.js application and PostgreSQL. Organize code by business feature. Keep domain rules independent of frameworks and isolate external systems at meaningful boundaries.

Deliver vertical slices. Introduce abstractions in response to real coupling or testing needs.

## Consequences

A simple local setup and one deployable unit. Channels can reuse the same application operations.
Modules are logical boundaries, not separately running services.
A split requires a new decision justified by scaling, operational isolation or ownership.
