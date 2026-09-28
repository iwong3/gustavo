# Plan: Supplements Redesign

## Overview

Rebuild Supplements around the daily stack (the Home card's check-off, 00042).
The page answers two questions: **"did I take X today?"** and **"when did I
start X, and how long has it been?"**. Designed over three mock rounds
(Sept 2026, artifact "Gustavo Supplements Concepts", rounds 1–3 in its version
history); the chosen direction is round 3's **T3 refined**.

4 pages + 3 forms become 2 pages + 1 form + 1 list:

| Route | What | Replaces |
|---|---|---|
| `/health/supplements` | Today tiles + month calendar + day panel | log history page, Log form |
| `/health/supplements/[id]` | Supplement page (label, Day X, 13-week grid, runs) | — (new) |
| `/health/supplements/stack` | Your Stack: Taking / As needed / Stopped | Manage page |
| `/health/supplements/new`, `/[id]/edit` | New / Edit supplement form | manage/new, manage/[id]/edit |

**Groups are retired** (pages, form, preset chips on this page *and* the
Health hub). Old `presets` rows (type `supplement`) stay in the DB, unused.

---

## Design Decisions

- **Logging is one tap everywhere**, same rules as the Home card: tap = +1
  dose, tap a finished item = −1, Undo toast. All writes go through the atomic
  `POST /supplement-logs/dose` with an explicit `date`.
- **Late-night rule (shipped first, Sept 2026):** until 6am, doses count for
  the previous day — `logDateString()` / `useLogDay()` in `utils/time` +
  `hooks/use-today`, cutoff `NIGHT_CUTOFF_HOUR` shared with the expense form.
  A one-line note ("Counting for Monday until 6 AM. Log for Tue") shows only
  between midnight and 6am. The page reuses the Home card's pattern.
- **Day X = the current run only.** A restart after a break starts at Day 1;
  old runs appear only as history (supplement page), never in the count.
- **Runs end on their own:** 7+ consecutive days with no dose ends a run at the
  last dose; the next dose starts a new run. A day or two missed stays in the
  run (an empty cell, not a break). "Stop taking" still exists (leaves the
  stack), but day counts don't depend on remembering to tap it.
- **Past dates via the calendar** (drag-to-scrub was rejected: too imprecise).
  Day fill = completion (full / partial / dashed = nothing). Tap a day → its
  panel opens inline below, editable (fixing a missed dose = one tap). The
  panel lists only what was in the stack that day, with day counts as of then.
- **Stack-change badges** on calendar days: **+** only additions
  (started/restarted), **−** only removals (stopped/run ended), **±** anything
  else (both, or a dose change like 1× → 2×). The day panel lists each change.
- **Tiles** (2 columns, alphabetical like Home): name, then "5 g · Day 210",
  capsules on the right; finished tiles sink (pressed look).
- **As needed** = active with `daily_doses` NULL (no schema change). The day
  panel's quiet "Also took" row logs one (it also holds stack supplements that
  weren't due that day — on a break); never counts toward completion.
- **No** streaks, supply tracking, dose times, milestones or "yesterday"
  nudge for now (held — may revisit). No comparative stats (single user).
- Title row: list icon → Your Stack; ⓘ `PageInfo` explains the calendar key,
  the 6am rule and the 7-day run rule. FAB = new supplement.

---

## Data

### Migration 00043: `supplement_events` (done)

Explicit stack changes the user made. Runs are *derived* (see below), so this
only holds what logs can't tell us.

```sql
CREATE TABLE supplement_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  supplement_id BIGINT NOT NULL REFERENCES supplements(id),
  date DATE NOT NULL,            -- the device's log day (client sends it)
  kind TEXT NOT NULL,            -- 'started' | 'stopped' | 'dose_changed' (app-validated)
  daily_doses INT,               -- the new value, for 'started' / 'dose_changed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
-- + audit trigger, index (user_id, supplement_id, date)
```

Seed: one `started` event per existing supplement at its earliest log date
(else `created_at::date`). Written by the supplements API: create → `started`
at the form's "Started" date (backdating); `daily_doses` change →
`dose_changed`; deactivate → `stopped`; reactivate → `started`.

### Runs: `lib/health/supplement-runs.ts` (pure, unit-tested)

`computeRuns(events, logDates, today)` →
`{ start, end | null, endReason: 'stopped' | 'gap' | null }[]`:
- A `started` event opens a run on its date; `stopped` closes it.
- Inside a run, a gap of ≥ 7 days with no dose **after the run's first logged
  dose** closes it at the last dose (`gap`). The span between a backdated
  start and the first logged dose is trusted, not a gap.
- A dose after a closed run opens a new run on that date (a derived restart).
- Day X = `today − currentRun.start + 1`.

Also derives calendar badges per date (events + derived restarts/gap-ends →
`+` / `−` / `±`). All client-side from `useSupplementData` (it already loads
every log); no new read endpoints needed beyond events.

---

## Phases (each deployable)

1. ✅ **Late-night rule** — Home card, hub, current page + form (Sept 2026).
2. ✅ **Data** — migration + seed, events API (GET; writes inside supplements
   POST/PUT), `supplement-runs.ts` + tests, `schema.md`.
3. ✅ **Main page (T3)** — tiles, calendar + badges, day panel (editable, as
   needed row), night note, `PageInfo`, skeleton, gallery specimens.
4. **Supplement page + Your Stack + form** — S1 (label, Day X, 13-week grid
   with breaks as flat lines, runs list, Stop/Start), S4 list, form (name
   suggestions → dose chips, How often 1×–4× / As needed, Started date).
5. **Removals** — groups pages/form/chips (page + hub), manage pages, log
   form, `supplement-presets.ts` if unused; update `forms-todo.md`,
   gallery; `pnpm check:cycles`.

## Decided

- Home card rows keep logging only (no link to the supplement page).
- Editing "Started" re-anchors the current run (moves its latest `started`
  event), so Day X can be corrected for things taken before logging began.
- A `started` event's `updated_at` is its "trusted through" horizon: log gaps
  before it never end the run (see schema.md § Supplement runs).
