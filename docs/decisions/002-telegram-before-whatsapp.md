# ADR 002 — Telegram before WhatsApp

Status: Accepted roadmap order; implementation deferred.
Date: 2026-10-06.

## Context

The desired habit is sending a short message to record a expense. Starting with multiple messaging providers would distract from learning the basic HTTP/persistence flow.

## Decision

Finish manual web operations first. Add Telegram as the first messaging channel.
Begin with deterministic commands, then add natural-language interpretation through validated tools.
Add WhatsApp only after Telegram and the agent flow are reliable and its official integration requirements are investigated.

## Consequences

No bot credentials or webhook endpoint are needed in v0.1.
Expense operations must remain reusable without coupling them to an HTTP request or a chat.
The decision does not assume access to a personal WhatsApp self-chat or promise a provider's future pricing/availability.
