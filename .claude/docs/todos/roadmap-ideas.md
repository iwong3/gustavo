# Roadmap Ideas (from July 2026 interview)

Captured wants, not yet scheduled:

- **Per-app footer** (Sept 2026, deferred) — rethink the bottom tab bar as the
  suite grows (e.g. each app — Trips, Health — getting its own footer/tabs)
  instead of one global Home | Trips | Health | Settings bar.
- **Tab memory** (Sept 2026, deferred) — re-tapping a tab returns to where you
  last were inside it (native tab-stack behaviour) instead of the tab root.

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
