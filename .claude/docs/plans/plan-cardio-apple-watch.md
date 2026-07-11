# Apple Watch Jog Data Integration

## Goal
Persist Apple Watch jog data into the app with minimal friction (iOS Shortcut → API),
store it alongside existing workouts, and visualize per-session details (map, HR graph,
stats, splits) in the workout detail drawer.

---

## Data Model

### New table: `cardio_sessions`

```sql
CREATE TABLE cardio_sessions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workout_id      BIGINT NOT NULL REFERENCES workouts(id),
    type            TEXT NOT NULL DEFAULT 'jog',       -- future: 'cycle', 'swim', etc.
    duration_sec    INT NOT NULL,                      -- total duration in seconds
    distance_m      NUMERIC(10,2) NOT NULL,            -- meters
    active_cal      INT,                               -- active calories (kcal)
    total_cal       INT,                               -- total calories (kcal)
    avg_hr          INT,                               -- average heart rate bpm
    max_hr          INT,                               -- max heart rate bpm
    elevation_gain_m NUMERIC(6,1),                     -- meters
    avg_cadence     NUMERIC(5,1),                      -- steps/min
    avg_power_w     NUMERIC(5,1),                      -- watts
    hr_samples      JSONB,                             -- [{t: <sec_offset>, bpm: <int>}, ...]
    splits          JSONB,                             -- [{distance_m: 1609, duration_sec: 480, avg_hr: 155}, ...]
    route_polyline  TEXT,                               -- Google encoded polyline
    weather         JSONB,                             -- {temp_f, humidity_pct, aqi} (optional)
    source_id       TEXT,                              -- Apple HealthKit workout UUID (dedup)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ                        -- soft delete
);

CREATE UNIQUE INDEX idx_cardio_sessions_source ON cardio_sessions(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_cardio_sessions_workout ON cardio_sessions(workout_id);
```

**Storage estimate per jog:**
- hr_samples: ~360 samples × ~15 bytes = ~5KB
- splits: ~5-8 entries × ~50 bytes = ~400 bytes
- route_polyline: ~2-5KB (Google encoding, very compact)
- weather: ~50 bytes
- Total: ~8-10KB per session. At 2x/week × 52 weeks = ~1MB/year. Negligible.

### New table: `user_api_keys`

```sql
CREATE TABLE user_api_keys (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL DEFAULT 'Apple Watch Shortcut',
    key_hash    TEXT NOT NULL,                         -- SHA-256 of the key (never store raw)
    key_prefix  TEXT NOT NULL,                         -- first 8 chars for identification
    last_used   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ                           -- soft revoke
);

CREATE INDEX idx_api_keys_prefix ON user_api_keys(key_prefix) WHERE revoked_at IS NULL;
```

The raw key is shown once at creation time. API validates by:
1. Extract prefix from incoming key
2. Look up row by prefix
3. SHA-256 the full key and compare to `key_hash`

---

## Auth: API Key Flow

### Key generation
- New API route: `POST /api/auth/api-keys` (session-auth required)
- Generates a random 32-byte token, hex-encoded (64 chars)
- Stores SHA-256 hash + 8-char prefix in `user_api_keys`
- Returns the raw key **once** — user copies it into their iOS Shortcut
- UI: button in Settings page to generate/revoke keys

### Key validation
- New helper: `lib/api-key-auth.ts`
- Checks `Authorization: Bearer <key>` header
- Looks up by prefix, compares hash
- Returns `userId` on success, 401 on failure
- Updates `last_used` timestamp

### Ingest endpoint auth
- `POST /api/health/cardio/ingest` accepts **either** session auth OR API key auth
- Helper: `requireAuthOrApiKey()` — tries session first, falls back to API key

---

## API Routes

### `POST /api/health/cardio/ingest`
The main endpoint called by the iOS Shortcut. Creates a workout + cardio session atomically.

**Request:**
```json
{
    "date": "2026-03-23",
    "startTime": "2026-03-23T07:30:00Z",
    "type": "jog",
    "durationSec": 1845,
    "distanceM": 5123.4,
    "activeCal": 312,
    "totalCal": 398,
    "avgHr": 155,
    "maxHr": 178,
    "elevationGainM": 42.3,
    "avgCadence": 168,
    "avgPowerW": 245,
    "hrSamples": [{"t": 0, "bpm": 85}, {"t": 6, "bpm": 102}, ...],
    "splits": [{"distanceM": 1609, "durationSec": 480, "avgHr": 152}, ...],
    "routePolyline": "encoded_polyline_string",
    "weather": {"tempF": 62, "humidityPct": 45, "aqi": 28},
    "sourceId": "apple-healthkit-uuid"
}
```

**Logic:**
1. Validate API key or session
2. Check `source_id` uniqueness (409 if duplicate — prevents double-sends)
3. Look up the "Jogging" muscle group ID from DB
4. In a transaction:
   a. Create workout (date, muscleGroupIds: [jogging_id], notes: auto-generated summary)
   b. Insert cardio_session linked to the workout
   c. Audit log via `withAuditUser`
5. Return `201 { workoutId, cardioSessionId }`

**Auto-generated notes:** e.g. "Jog — 3.18 mi, 30:45, 9:40/mi pace"

### `GET /api/health/cardio/[workoutId]`
Fetch cardio session data for a workout. Used by the detail drawer.

**Response:**
```json
{
    "id": 1,
    "type": "jog",
    "durationSec": 1845,
    "distanceM": 5123.4,
    "activeCal": 312,
    "totalCal": 398,
    "avgHr": 155,
    "maxHr": 178,
    "elevationGainM": 42.3,
    "avgCadence": 168,
    "avgPowerW": 245,
    "paceSecPerMile": 580,
    "hrSamples": [...],
    "splits": [...],
    "routePolyline": "...",
    "weather": {...}
}
```

### `POST /api/auth/api-keys` / `GET /api/auth/api-keys` / `DELETE /api/auth/api-keys/[id]`
CRUD for API keys (session-auth only). GET returns list with prefix + name + last_used (never the key).

---

## Workout Detail Drawer: Cardio Section

When opening a workout that has a `cardio_session`, show a new section **below Exercises**
(or below Muscle Groups if no exercises). The drawer is already scrollable.

### Detection
- When the drawer opens, check if the workout has a cardio session via a lightweight flag.
- Options: (a) include a `hasCardio: boolean` on the Workout type returned by the list API,
  or (b) lazy-fetch from `/api/health/cardio/[workoutId]` when drawer opens.
- **Recommendation:** option (a) — add `hasCardio` to the workout list query with a LEFT JOIN.
  Then lazy-fetch full cardio data only when the drawer opens (avoids loading HR/route data for every workout in the list).

### Layout (top to bottom, inside the drawer)

```
┌─────────────────────────────────┐
│  [existing header, notes,       │
│   muscle groups, exercises]     │
│                                 │
│  ─── section divider ───        │
│                                 │
│  🏃 JOG DETAILS                │
│                                 │
│  ┌─────────┬─────────┐         │
│  │ 3.18 mi │ 30:45   │  stat   │
│  │ distance│ time    │  cards   │
│  ├─────────┼─────────┤         │
│  │ 9:40/mi │ 155 bpm │         │
│  │ pace    │ avg hr  │         │
│  ├─────────┼─────────┤         │
│  │ 312 cal │ 42.3 m  │         │
│  │ active  │ elev    │         │
│  └─────────┴─────────┘         │
│                                 │
│  HEART RATE          max: 178   │
│  ┌─────────────────────┐       │
│  │  ╱╲   ╱╲╱╲         │  line  │
│  │ ╱  ╲_╱    ╲╱       │  chart │
│  └─────────────────────┘       │
│  0:00              30:45        │
│                                 │
│  SPLITS                         │
│  ┌────────────────────────┐    │
│  │ Mi 1  │ 9:22 │ 152 bpm│    │
│  │ Mi 2  │ 9:40 │ 155 bpm│    │
│  │ Mi 3  │ 10:01│ 161 bpm│    │
│  └────────────────────────┘    │
│                                 │
│  ROUTE                          │
│  ┌─────────────────────┐       │
│  │                     │  map  │
│  │    Google Map with   │       │
│  │    polyline overlay  │       │
│  │                     │       │
│  └─────────────────────┘       │
│                                 │
│  [delete confirmation]          │
└─────────────────────────────────┘
```

### Components

1. **CardioStatGrid** — 2-column grid of neo-brutalist stat cards (same style as MuscleGroupStatCard)
   - Distance (converted to miles), Duration (mm:ss), Pace (min:sec/mi), Avg HR, Active Calories, Elevation Gain
   - Conditional: only show metrics that have data

2. **HeartRateChart** — @visx line chart (already a dependency)
   - X axis: time offset (0 to duration)
   - Y axis: BPM
   - Color: red/orange gradient
   - Shows max HR as a horizontal reference line or annotation
   - ~300-360 points renders fast in SVG

3. **SplitsTable** — simple table/list of per-mile splits
   - Mile number, pace (mm:ss), avg HR for that split
   - Highlight fastest/slowest split

4. **RouteMap** — Google Maps with polyline overlay
   - Use Google Maps JavaScript API via `@vis.gl/react-google-maps` (official React wrapper)
   - Decode the polyline on the client, render as a Polyline overlay
   - Fixed height (~200px), no interaction needed (zoom/pan disabled or minimal)
   - API key already available via `GOOGLE_MAPS_API_KEY` env var
   - Alternative: Google Static Maps API (just an `<img>` tag, simpler, but less flexible)
   - **Recommendation:** Start with Static Maps API — it's literally an img URL with the encoded polyline,
     zero JS overhead, and sufficient for a view-only route trace. Upgrade to JS API later if interactivity needed.
   - Static Maps URL: `https://maps.googleapis.com/maps/api/staticmap?size=600x300&path=enc:POLYLINE&key=KEY`

---

## iOS Shortcut Design

### Flow
1. User finishes a jog on Apple Watch
2. Opens Shortcuts app (or taps a home screen shortcut)
3. Shortcut runs:
   - "Find Health Samples" → get most recent workout of type "Running"
   - Extract: duration, distance, start/end time, calories
   - "Find Health Samples" → heart rate samples within workout time window
   - "Find Health Samples" → route data (if available via Shortcuts)
   - Build JSON payload
   - "Get Contents of URL" → POST to `/api/health/cardio/ingest` with Bearer token

### Shortcut limitations & workarounds
- **Route/GPS data:** Shortcuts cannot directly access workout route data from HealthKit.
  Workaround options:
  - Use a helper app like "Toolbox Pro" or "Data Jar" that can access route coordinates
  - Use the Apple Health export (XML) and parse it — too much friction
  - Skip route initially, add it later via a companion shortcut or manual upload
  - **Recommendation:** Start without route data in the Shortcut. Add route support later
    when we find the right extraction method. The DB schema and UI support it from day one.
- **Heart rate samples:** Shortcuts CAN query health samples by type "Heart Rate" filtered to the workout time range. This works.
- **Splits:** Not directly available. Can be computed server-side from distance + duration + HR samples if we have timestamps for distance checkpoints. Or compute simple even splits from total distance/time.
  - **Recommendation:** Compute splits server-side from HR samples + total distance/duration (approximate even splits with HR data per segment).
- **Weather:** Shortcuts can get current weather, but not historical weather at workout time. Could capture it if the Shortcut runs immediately after the workout. Optional field.

### Shortcut payload (realistic v1)
```json
{
    "date": "2026-03-23",
    "type": "jog",
    "durationSec": 1845,
    "distanceM": 5123.4,
    "activeCal": 312,
    "totalCal": 398,
    "hrSamples": [{"t": 0, "bpm": 85}, ...],
    "sourceId": "healthkit-workout-uuid"
}
```

Fields NOT in v1 (add later): `routePolyline`, `splits` (server-computed), `elevationGainM`,
`avgCadence`, `avgPowerW`, `weather`.

---

## Implementation Phases

### Phase 1: Database + API Key System
1. Migration 00030: `cardio_sessions` table
2. Migration 00031: `user_api_keys` table
3. `lib/api-key-auth.ts` — key generation, hashing, validation
4. API routes: `POST/GET/DELETE /api/auth/api-keys`
5. Settings UI: generate/revoke API keys (in existing settings page)

### Phase 2: Ingest API
1. `POST /api/health/cardio/ingest` — creates workout + cardio session
2. `GET /api/health/cardio/[workoutId]` — fetch cardio data for drawer
3. Server-side split computation from HR samples + distance
4. Dedup via `source_id`
5. Update workout list query to include `hasCardio` flag

### Phase 3: Workout Drawer UI
1. Add `CardioSession` type to `lib/health-types.ts`
2. Lazy-fetch cardio data when drawer opens for a workout with `hasCardio`
3. `CardioStatGrid` component (distance, time, pace, HR, calories, elevation)
4. `HeartRateChart` component (@visx line chart)
5. `SplitsTable` component
6. `RouteMap` component (Google Static Maps — conditional, only if polyline exists)
7. Wire into `WorkoutDetailDrawer` below exercises section

### Phase 4: iOS Shortcut
1. Build the Shortcut (user does this, with spec from Phase 2)
2. Test end-to-end: finish jog → run Shortcut → data appears in app
3. Iterate on extracted fields

### Future
- Route extraction (companion app or Toolbox Pro)
- Multi-session trends (pace over time, distance over time)
- Weekly/monthly summaries
- Correlation with symptom/diet data
- Support for other cardio types (cycling, swimming)
- Auto-run Shortcut via iOS Automation (after workout trigger)

---

## Dependencies
- **New package:** potentially `@vis.gl/react-google-maps` or none (if using Static Maps img tag)
- **Existing:** @visx (already installed, used for sparklines in workout drawer)
- **Google Maps API key:** already configured (`GOOGLE_MAPS_API_KEY` env var)
- **No native app required** — iOS Shortcuts + existing PWA

## Files to create/modify
- `database/migrations/00030_create_cardio_sessions.sql`
- `database/migrations/00031_create_user_api_keys.sql`
- `lib/api-key-auth.ts`
- `lib/health-types.ts` (add CardioSession type)
- `app/api/auth/api-keys/route.ts`
- `app/api/auth/api-keys/[id]/route.ts`
- `app/api/health/cardio/ingest/route.ts`
- `app/api/health/cardio/[workoutId]/route.ts`
- `app/components/health/workout-detail-drawer.tsx` (add cardio section)
- `app/components/health/cardio-stat-grid.tsx`
- `app/components/health/heart-rate-chart.tsx`
- `app/components/health/splits-table.tsx`
- `app/components/health/route-map.tsx`
- `app/gustavo/settings/page.tsx` (add API key management)
- `backend/health-queries.ts` (add cardio queries, update workout list query)
- `.claude/docs/schema.md` (update)
