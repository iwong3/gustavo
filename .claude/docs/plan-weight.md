# Plan: Weight Logging

## Overview

Simple weight tracking — log ~once a week, see trends over months/years.
Two surfaces: a read-only card on the health landing page, and a dedicated
page (`/health/weight`) for logging + viewing the trend chart.

Single-user (Ivan only). Same auth pattern as other health features.

---

## Design Decisions

- **Unit**: lbs only (NUMERIC(5,1) — e.g. 185.5)
- **Frequency**: ~weekly, no time-of-day tracking
- **No unique constraint** on (user_id, date) — keep flexible
- **No notes, body fat %, or other metadata** — just the number
- **No correlation** with symptoms/diet for now
- **Soft deletes** via `deleted_at` (consistent with all other tables)
- **Audit trigger** like every other table

---

## Schema

### Migration 00034: `weight_logs`

```sql
CREATE TABLE weight_logs (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  date       DATE NOT NULL,
  weight_lbs NUMERIC(5,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, date DESC);
```

Plus the standard audit trigger (same pattern as all other tables).

---

## API Routes

### `GET /api/health/weight-logs`

Returns all weight logs for the authenticated user, ordered by date DESC.

Optional query params:
- `startDate` / `endDate` — filter range (useful for chart views)

Response: `WeightLog[]`

### `POST /api/health/weight-logs`

Body: `{ date: string, weightLbs: number }`

Creates a new weight log entry.

### `PUT /api/health/weight-logs/[id]`

Body: `{ date?: string, weightLbs?: number }`

Updates an existing entry.

### `DELETE /api/health/weight-logs/[id]`

Soft delete.

---

## Types

Add to `lib/health-types.ts`:

```ts
export type WeightLog = {
  id: number
  date: string       // YYYY-MM-DD
  weightLbs: number  // e.g. 185.5
  createdAt: string
}
```

---

## UI

### Health Landing Page — Weight Card

A new section/card in the dashboard (same drag-to-reorder pattern as other
sections). Shows:

- **Latest weight** (big number, e.g. "182.5 lbs")
- **Date of last log** (e.g. "Apr 2")
- **Delta from previous** (e.g. "▼ 1.5 lbs" in green, "▲ 2.0 lbs" in red)
- **Mini sparkline** — last ~12 data points (roughly 3 months at weekly cadence)
- Badge link to `/gustavo/health/weight` (like the other sections)

Read-only — no logging from the card.

### Weight Page (`/gustavo/health/weight`)

Simple layout, top to bottom:

1. **Log input** — date picker (defaults to today) + weight number field +
   "Log" button. Minimal friction: tap, type number, submit.
2. **Line chart** — shows all entries over time. Default view: 3 months.
   Toggle for 6mo / 1yr / all. X-axis = dates, Y-axis = weight.
   Uses the same charting approach as other pages (or a lightweight library
   like recharts if nothing is currently used).
3. **History list** — scrollable list of past entries, newest first.
   Each row: date + weight. Swipeable for edit/delete (same pattern as
   supplement/food logs).

---

## Implementation Phases

### Phase 1: Schema + API
- Migration 00034
- CRUD API routes (4 routes)
- TypeScript types

### Phase 2: Weight Page
- `/gustavo/health/weight/page.tsx`
- Log input (date + weight + submit)
- History list with swipe edit/delete
- Line chart (decide on charting library — check if one is already used)

### Phase 3: Landing Page Card
- Add weight card to `HealthDashboardV2`
- Add `weight` to `HealthSection` ordering
- Fetch latest weight data on health landing page
- Sparkline (can use same chart lib, or a simple SVG sparkline)

---

## Charting Library Decision (Phase 2)

Need to check what's already in the project. Options:
- **recharts** — popular, React-native, good for line charts
- **@visx** — already a dependency (`@visx/curve` is in package.json),
  lower-level but more control
- **Simple SVG** — for the sparkline on the card, may not need a library

Since `@visx` is already a dependency, leaning toward using it for both
the full chart and the sparkline to avoid adding a new dependency.
