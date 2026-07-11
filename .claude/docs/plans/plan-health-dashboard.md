# Health Dashboard — Quick Actions Plan

## Problem
Logging workouts, food, and supplements from the Health landing page requires too many taps:
Health → Tool page → Open drawer → Fill form → Submit. For daily habits that happen 2-3x/day,
this friction adds up.

## Goal
Turn the Health landing page into a **today-focused dashboard** where the most common actions
(apply a preset, review what's been logged) are 1-2 taps away — without losing navigation to
the full tool pages.

---

## Proposed Layout

```
┌──────────────────────────────┐
│  Workout Presets             │  ← horizontal chip row
│  [Push Day] [Pull Day] ...  │
├──────────────────────────────┤
│  Days Since Last Workout     │  ← existing grid (push/pull/legs/other)
│  [Chest 2d] [Shoulders 0d]  │     updates live after applying preset
│  [Upper Back 4d] [Biceps 1] │
│  ...                         │
├──────────────────────────────┤
│  Diet Presets                │  ← horizontal chip row
│  [Chipotle] [Morning Shake] │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  Today's Food                │  ← last 3 entries (or "Nothing yet")
│  • Eggs x2                   │
│  • Rice x1                   │
│  • Chicken x3                │
├──────────────────────────────┤
│  Supplement Presets          │  ← horizontal chip row
│  [Morning Stack] [Night]     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  Today's Supplements         │  ← last 3 entries (or "Nothing yet")
│  • Creatine                  │
│  • Vitamin D                 │
│  • Magnesium                 │
├──────────────────────────────┤
│  Tools                       │  ← existing nav cards (smaller/compact)
│  Workouts | Exercises | ...  │
└──────────────────────────────┘
```

---

## Section Details

### 1. Workouts (enhanced existing section)

**Presets row** — horizontal scrollable chips above the days-since grid.
- Tap a preset → `POST /api/health/presets/{id}/apply` with today's date
- On success: re-fetch days-since data → grid animates/updates to show "Today"
- Brief toast or chip glow as confirmation
- If no workout presets exist, hide the row entirely

**Days-since grid** — unchanged, but now doubles as visual confirmation.
- After applying "Push Day", Chest/Shoulders/Triceps flip from red/orange to green "Today"
- This is the "limited view of logs" for workouts — the grid IS the confirmation

**No log list needed** — the days-since grid already communicates what was worked today.

**Workout stats** — compact row below the days-since grid.
- "X day streak" — consecutive days with at least one workout logged (breaks on rest days)
- "30-day: X workout days, X rest days" — simple count from the last 30 calendar days
- Computed from `GET /api/health/workouts` data (fetch last 30 days of workouts, count
  unique dates for rest/workout split, walk backwards from today for streak)
- Dimmed/small text, informational — not tappable

### 2. Diet (new condensed section)

**Presets row** — horizontal scrollable chips.
- Tap a preset → `POST /api/health/presets/{id}/apply` with today's date
- On success: re-fetch today's food logs, list updates
- Show a brief loading state on the chip during apply

**Today's food log** — compact list of today's entries (max 3 visible, expandable).
- Each row: food name + quantity (e.g. "Eggs x2")
- Meal groups shown as a single line: "Chipotle (4 items)"
- If nothing logged today, show dimmed "No food logged today" with a subtle "+" to open the
  full diet page
- Tap the section header or "View all" → navigates to `/gustavo/health/diet`

### 3. Supplements (new condensed section)

**Presets row** — horizontal scrollable chips.
- Tap a preset → `POST /api/health/presets/{id}/apply` with today's date
- On success: re-fetch today's supplement logs, list updates

**Today's supplement log** — compact list of today's entries (max 3 visible, expandable).
- Each row: supplement name (+ quantity if >1)
- If nothing logged today, show dimmed "No supplements logged today"
- Tap section header → navigates to `/gustavo/health/supplements`

---

## Data Fetching

Current page fetches:
- `GET /api/health/workouts/days-since?today={date}`

New fetches needed (all parallel on mount):
- `GET /api/health/presets?type=workout`
- `GET /api/health/presets?type=diet`
- `GET /api/health/presets?type=supplement`
- `GET /api/health/food-logs?date={today}`
- `GET /api/health/supplement-logs?date={today}`
- `GET /api/health/workouts?startDate={today-30}&endDate={today}` (for streak + 30-day stats)

After applying a preset, re-fetch only the relevant section's data.

---

## Interaction Details

### Preset Chip Behavior
- Idle: neo-brutalist chip style (border, shadow, colored bg matching tool color)
- Tap: press animation (shadow collapse + translate), then loading spinner
- Success: brief green checkmark flash, data refreshes
- Error: brief red flash, chip returns to idle
- Long-press (future): could open preset editor

### Today's Log Behavior
- Tap a log entry → navigate to the full tool page (deep link to that day)
- Swipe to delete (reuse existing SwipeableRow) — optional, maybe v2
- "View all →" link at bottom of each section

### Empty States
- No presets for a type: hide that preset row entirely
- No logs today: single dimmed line "No [food/supplements] logged today"
- Both empty: section still shows with just the dimmed message

---

## Additional Ideas

### "Streak" Indicator
Show a small streak count next to each section header — "Diet 🔥 12" meaning you've logged
food 12 days in a row. Motivational, and helps you notice if you forgot to log yesterday.
Could be computed client-side from the log data we already fetch.

### "Quick Add" Button per Section
Besides presets, a small "+" button in each section header that opens the respective drawer
directly (skipping the intermediate page). For when you want to log something that isn't a
preset. Links to: exercise page drawer, diet page drawer, supplements page drawer.

### Time-Aware Preset Suggestions
If presets have implicit time associations (e.g. "Morning Stack" supplements, "Breakfast"
meals), surface the most relevant ones based on time of day. Morning → breakfast presets first.
Evening → dinner presets. Could be done by naming convention or a time_of_day column on presets.

### "Yesterday" Backfill
Sometimes you forget to log. A small "Log for yesterday" toggle at the top that switches all
preset-apply calls to yesterday's date. The today's log sections would also switch to show
yesterday's logs for confirmation.

### Workout Preset → Edit Flow
After applying a workout preset, the workout is created but you might want to fill in
weights/reps. Show a brief "Edit workout →" link in the confirmation that takes you to the
exercise page with that workout expanded.

---

## Implementation Phases

### Phase 1: Wire up data
- Fetch all presets + today's logs on mount (parallel)
- No UI changes yet, just verify data loading

### Phase 2: Workout presets
- Add preset chip row above days-since grid
- Wire tap → apply → re-fetch days-since
- Verify grid updates correctly

### Phase 3: Diet section
- Add diet section below workouts: presets + today's food summary
- Wire tap → apply → re-fetch food logs
- Compact log display

### Phase 4: Supplements section
- Add supplements section: presets + today's supplement summary
- Wire tap → apply → re-fetch supplement logs

### Phase 5: Tools section (compact)
- Shrink existing tool cards to a more compact row/grid
- They're now secondary navigation, not the primary interaction

### Phase 6 (optional): Polish
- Streak indicators
- Quick-add buttons
- Time-aware suggestions
- Yesterday backfill toggle

---

## Existing APIs Used (no backend changes needed)

| Action | Endpoint |
|--------|----------|
| Fetch workout presets | `GET /api/health/presets?type=workout` |
| Fetch diet presets | `GET /api/health/presets?type=diet` |
| Fetch supplement presets | `GET /api/health/presets?type=supplement` |
| Apply any preset | `POST /api/health/presets/{id}/apply` |
| Fetch today's food | `GET /api/health/food-logs?date={today}` |
| Fetch today's supplements | `GET /api/health/supplement-logs?date={today}` |
| Fetch days since | `GET /api/health/workouts/days-since?today={today}` |

No new migrations, no new API routes. Everything builds on existing infrastructure.
