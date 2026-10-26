# ADR 0001: Build the demo as a client-only application

- Status: Accepted
- Date: 2026-10-26

## Context

The project is a portfolio demonstration of a support CRM. It needs to be easy to review, cheap to host, and honest about what it demonstrates. A conventional demo would require an API, authentication, database provisioning, and operational maintenance, all of which add setup friction and distract from the frontend and product work.

The important behaviours are queue management, SLA handling, ticket updates, customer context, knowledge search, and persistence across reloads.

## Decision

Use a frontend-only architecture:

- React and TypeScript for the application.
- IndexedDB for durable local state.
- A deterministic seeded generator for initial data.
- Static hosting with hash-based routes.
- No runtime network requests.

The UI clearly identifies itself as a demo and states that data stays in the browser.

## Consequences

### Positive

- Reviewers can run the whole product with `npm install` and `npm run dev`.
- No credentials, backend setup, API keys, or hosted database are needed.
- The demo works offline after the initial asset load.
- Persistence and reset are visible, testable behaviours rather than mocks.
- Deployment is a static asset upload.

### Negative

- Data is tied to one browser profile and cannot be shared.
- There is no multi-user concurrency, authorization, or audit trail beyond local activity.
- IndexedDB migrations and storage failures must be handled client-side.
- A production version would need a server boundary and a different security model.

### Mitigations

- The repository isolates persistence from UI code.
- Storage failure and loading states are explicit.
- The README and Settings screen document the limitations.
- Hash routing keeps deep links functional on static hosts without rewrite rules.
