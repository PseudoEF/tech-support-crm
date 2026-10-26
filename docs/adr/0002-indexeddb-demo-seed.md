# ADR 0002: Use deterministic generated data with IndexedDB persistence

- Status: Accepted
- Date: 2026-10-26

## Context

A CRM demo needs enough relational data to feel real: customers with accounts, tickets with conversations and timelines, agents organized into teams, assets, activity, and knowledge articles. Hand-authoring all records would create a large, fragile fixture file. Random generation would make screenshots, tests, and bug reports inconsistent.

The app also needs changes to survive reloads and a reliable way to restore the original state.

## Decision

Generate the initial dataset with a seeded PRNG, then persist the resulting snapshot in IndexedDB.

- A fixed seed (`0x5eedc0de`) controls all generated choices.
- The generator is a pure function of seed plus reference time.
- The first load writes a normalized set of object stores.
- Ticket commits update the ticket, append messages, and prepend an activity event in one transaction.
- Reset clears every store and writes a fresh deterministic snapshot.
- Tests lock down counts, referential integrity, timeline ordering, and repeatability.

## Consequences

### Positive

- The demo is rich enough to exercise real workflows.
- Reloads preserve user changes.
- Resetting returns to a credible state without shipping a large JSON fixture.
- Seed invariants can be tested as domain logic.
- No random data leaks into screenshots or automated checks when the clock is fixed.

### Negative

- The seed time affects dates in the generated data.
- Regenerating after a schema change requires a database version bump or explicit reset.
- A fully normalized data model is unnecessary for this client-only workload; the snapshot is stored as object stores and joined in selectors.

### Mitigations

- Reset is exposed prominently and documented.
- The database has a versioned upgrade hook.
- Tests pin the seed and clock for deterministic assertions.
- The repository owns migrations and storage access so UI code remains storage-agnostic.
