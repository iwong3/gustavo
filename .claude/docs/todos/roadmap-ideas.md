# Roadmap Ideas (from July 2026 interview)

Captured wants, not yet scheduled:

- **DB backup** — on-demand and/or automated `pg_dump` of the Neon prod DB,
  stored securely (Ivan's PC or Google Drive). Neon free tier only keeps ~1 day
  of restore history.
- **In-app bug reporting** — a way for users to report bugs from inside the app
  and track them, ideally capturing context about the table/mechanism involved.
- **UX snappiness audit** — the PWA has a "slight clunkiness, like a mobile
  website"; hunt down loading jank, transition lag, and slow interactions.
  Fast/native feel is UX priority #1.
- **UI consistency audit** — catalog all forms/dialogs/drawers, define one
  canonical form pattern (component + input order), migrate outliers, codify in
  a ui-conventions doc. (Storybook considered and deferred — too heavy.)
- **Thin unit-test layer** — vitest on debt calculation (lib/debt.ts),
  permission functions, and split detection. No form/page tests.
