# Workouts

The Workouts page (`/gustavo/health/exercise`) is the log: look back, open,
fix. Home's card does the daily one-tap logging and the Hub card the long view.
Redesigned Sept 2026 (mock rounds in the "Gustavo Workouts Concepts" artifact).
Ivan logs **muscle groups only** these days (no exercises since July 2026),
on a Push / Pull / Legs / Jogging (+ Core) rotation.

## One workout per day (00044)

- A partial unique index on `workouts (user_id, date) WHERE deleted_at IS NULL`.
  Logging a routine (`POST /presets/[id]/apply`) or saving the new-workout form
  (`POST /workouts`) on a day that already has one **adds to it**: groups
  (`ON CONFLICT DO NOTHING`), exercises appended after the existing ones,
  notes joined. Helpers: `lib/workout-day.ts` (server-only;
  `getOrCreateDayWorkout` is race-safe via `ON CONFLICT`).
- **Undo removes only what that tap added.** The apply response returns
  `{ workoutId, created, addedMuscleGroupIds, addedWorkoutExerciseIds }`;
  `useApplyWorkoutRoutine` (`components/health/workout-presets.ts`, shared by
  Home and the page) DELETEs a workout it created, else PATCHes
  `/workouts/[id]` with the ids to remove. Nothing added → "X is already logged".
- Editing a workout onto a date that already has one → **409** ("Edit that one
  instead"), shown in the form.
- The migration merged existing same-day pairs into the earliest workout and
  soft-deleted the rest. Rows still group by date client-side, so a stale cache
  can't show two rows for a day.

## Model — `lib/health/workout-days.ts` (tested: `tests/workout-days.test.ts`)

- **Routine labels:** a day "is" a routine when it trained *all* of that
  routine's groups (targets roll up: Lats → Upper Back). Leftover groups are
  **extras** ("+ Lower Back" — deliberately not folded into Pull; it goes with
  Pull some days and Legs on others). No match → the group names themselves.
- `gap` = days since the previous workout day (the date's badge).
- `routineRecency` (tiles), `groupByWeek` (Sunday-start, empty weeks included),
  `routineStats` over a `{from, to}` range (`since` is always from today),
  `monthCells` / `addMonths` (the calendar's month).

## Page

- **Title row:** only the List / Calendar icon toggle (`SlidingToggle` options
  take an `icon`). View / calendar window / month / filter live in
  `components/health/workouts-view-store.ts` (in memory, like the Hub's window).
- **⚡ (→ Routines) leads the routines row** in both modes.
- **List** (`components/health/workout-log.tsx`): rotation tiles — name only,
  days since in a corner badge on Home's green / orange / red scale, tap = log
  today. Then week cards (7-dot strip + days trained); one row per day with a
  chip per routine, dashed chips for extras, and **the date badged with days
  since the last workout** (shown after ≥ 1 rest day). Per-routine badges on the
  chips were tried and dropped as busy — per-routine history is the calendar's
  job. Runs of empty weeks fold into one "N weeks off" line.
- **Calendar** (`components/health/workout-calendar.tsx`): routine **filter
  chips** — separate from the tiles on purpose (the tiles log; one control
  doing both by mode would log by accident). A card whose orange strip holds
  **flat Month / 90D / 1Y tabs** with a sliding underline (a boxed toggle in the
  boxed strip read as a box in a box). Month = square days, ‹ › paging from the
  first workout's month to this one, tap a day → the workout; 90D / 1Y = the
  Hub's weeks-as-columns heatmap. Chosen routine filled, other workouts pale.
  Stats: the Hub's for All; times / avg gap / longest gap / since for a routine.
