# Supplements

Built around the **daily stack** — supplements with `daily_doses` set, checked
off one dose at a time on the Home card and the Supplements page. Two jobs:
"did I take X today?" and "how long have I been on X?". Redesigned Sept 2026
(mock rounds in the "Gustavo Supplements Concepts" artifact; the plan is
`plans/plan-supplements-redesign.md`, historical).

## Model

- **Daily stack = `daily_doses` ≥ 1.** 0 (NULL) means *off the stack* — as
  needed, or stopped. There is no Active toggle any more; `is_active` is legacy
  (the form sends `isActive: true` on save to revive old inactive rows).
- **A day's progress** is the `supplement_logs` row for (supplement, date);
  `quantity` = doses taken. Taps go through the atomic
  `POST /supplement-logs/dose` (±1, deletes the row at 0).
- **Log day, not calendar day:** before 6am it's still yesterday —
  `logDateString()` / `useLogDay()` (`utils/time`, `hooks/use-today`).
  `useStackDay()` adds the "Counting for Monday until 6 AM · Log for Tue"
  note + switch, shared by Home and the Supplements page.
- **Stack changes** (`supplement_events`, 00043): the supplements API records
  `started` (0 → n), `stopped` (n → 0), `dose_changed` (n → m), dated with the
  client's `eventDate`. Dose taps never write events. Seeded with each
  supplement's first log as its start.
- **Runs / Day X** are derived, never stored (`lib/health/supplement-runs.ts`):
  a start opens a run, a stop ends it (the day before, unless a dose was taken
  that day), and **7+ days in a row without a dose ends it** at the last dose;
  the next dose restarts at Day 1. Day X counts the current run only. A
  `started` event's `updated_at` is its "trusted through" horizon — log gaps
  before it never break the run (backdated starts, old sparse logs).
- **Calendar history** (`lib/health/supplement-calendar.ts`): per day, what
  was due (in a run, on the stack then) vs taken; change lines + badges
  (**+** only additions, **−** only removals, **±** anything else). A day's
  events **net out** — on then off, or 1× → 2× → 1×, shows nothing. Doses
  taken while off the stack never make runs or count as due.

Both libs are pure and tested (`tests/supplement-runs.test.ts`,
`supplement-calendar.test.ts`, `log-date.test.ts`).

## Pages

| Route | What |
|---|---|
| Home card (`components/home/supplements-card.tsx`) | Today's stack, tap = dose, swipe = Undo |
| `/health/supplements` | Daily-stack tiles (dose + Day X), then the board-style month calendar; tap a day → lavender day panel (editable rows, changes below, pencil → log form) |
| `/health/supplements/new?date=` | Day log form: daily tiles (tap adds, full clears) + as-needed tiles (tap adds, − removes, logged-first); explicit Save |
| `/health/supplements/manage` | **Your Stack** — "Daily stack" and "Off the stack" boards; tap the 2× tag for an in-place − 2× + (settles 0.7s; 0 applies instantly); + restacks at 1×; rows animate between boards. Reached by tapping the page's title pill. |
| `/health/supplements/manage/new`, `[id]/edit` | Supplement form; daily stack is a 0–12 stepper |

Shared pieces live in `components/health/supplements/` (tiles, capsules,
calendar, day panel, your-stack, night-line, help). Dose taps:
`useDoseTaps(date)` (`hooks/use-supplement-dose`) — optimistic on both the
day's list and the full history. Purple family: `supplementColors` in
`lib/colors.ts`.

Verify UI at `/dev/gallery/supplements` (live on local state, sample stack),
`/dev/gallery/forms` (both forms) and `/dev/gallery/loading` (skeleton).

## Still to do

Groups (supplement presets) are retired in the design but still exist: the
`groups/` pages, the group form, `supplement-presets.ts`, and the Health hub's
supplement routine chips. Remove them, then consider dropping `is_active`.
