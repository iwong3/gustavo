# Google Places Integration Plan

## Overview

Add Google Places autocomplete to the expense form, allowing users to associate expenses
with real-world places. Auto-derive trip Locations from the place's city/municipality.

## GCP Setup (DONE)

- Project: "gustavo"
- APIs enabled: Places API (New), Maps JavaScript API
- API key restricted to app domains (localhost + Vercel)
- Daily quotas: 500 AutocompletePlacesRequest/day, 500 GetPlaceRequest/day
- $0 budget with 100% alert
- Env var: `GOOGLE_MAPS_API_KEY` in `.env.local`

---

## Phase 1: Core Google Places Integration (BUILD NOW)

### 1a. Database Migration (00019)

Add Google Places columns to `expenses`:

```sql
ALTER TABLE expenses
  ADD COLUMN google_place_id TEXT,
  ADD COLUMN google_place_name TEXT,
  ADD COLUMN google_place_address TEXT,
  ADD COLUMN google_place_lat NUMERIC(10,7),
  ADD COLUMN google_place_lng NUMERIC(11,7);

CREATE INDEX idx_expenses_google_place ON expenses (google_place_id)
  WHERE google_place_id IS NOT NULL;
```

All nullable — Google Place is optional on every expense.

Precision: 7 decimal places ≈ 1.1cm accuracy. lat range ±90 (10,7), lng range ±180 (11,7).

**Why columns, not a separate table:** This is a 1:1 relationship (one expense → zero or one
place). A separate `expense_places` table would add a JOIN to every expense query for no real
benefit — no deduplication needed, data is tiny, and the pattern matches existing grouped
nullable columns on expenses (e.g., `exchange_rate` + `cost_converted_usd`). If we ever need
a "places directory" across trips, we can extract to a table later.

### 1b. API Routes

**`POST /api/places/autocomplete`**
- Server-side proxy (keeps API key off the client)
- Request: `{ query: string, sessionToken?: string }`
- Calls Google Places Autocomplete (New) API
- Returns: `{ predictions: Array<{ placeId, name, address }> }`
- Session tokens: Google groups autocomplete keystrokes into a billing session.
  Generate a UUID on the client when the user starts typing, reuse it until they
  pick a result or abandon. Saves money (session = 1 charge vs per-keystroke).

**`GET /api/places/[placeId]`**
- Fetches Place Details (New) for a selected place
- Returns: `{ placeId, name, address, lat, lng, addressComponents }`
- `addressComponents` includes typed components (`locality`, `administrative_area_level_1`,
  `country`) — used by the client to auto-derive Location
- Field mask: `id,displayName,formattedAddress,location,addressComponents`
  (only request what we need — Google charges by field)

### 1c. Auto-Derive Location from Address

When a Google Place is selected on the expense form:

1. Extract the city from `addressComponents`:
   - Use `locality` if present (works for most cities worldwide)
   - Fall back to `administrative_area_level_1` (handles Tokyo, where "locality"
     returns sub-wards like "Shibuya City" but admin_level_1 returns "Tokyo")
   - Fall back to `country` as last resort
2. Check if a Location with that name already exists for this trip
   - If yes: auto-select it
   - If no: auto-create it via existing `POST /api/trips/{tripId}/locations` endpoint
3. Set `location_id` on the expense (transparent to the user)

The user never sees or interacts with the Location field on new trips. Location is
a derived, behind-the-scenes grouping used for filtering and charts.

**Concern — Tokyo vs Shibuya City:**
Google's `locality` for places in Tokyo returns district names like "Shibuya City",
"Chiyoda City", etc. We want these grouped as "Tokyo". Strategy:
- Prefer `administrative_area_level_1` when the country is Japan (it returns "Tokyo")
- For most other countries, `locality` is the right level (e.g., "Paris", "Barcelona")
- Start with a simple rule: if `administrative_area_level_1` exists AND `locality`
  contains "City" (Japanese district pattern), use admin_level_1. Adjust if needed
  after real-world testing.

### 1d. Expense Form Changes

**File:** `app/components/expense-form-dialog.tsx`

New field: **"Place"** (or "Address") — positioned between Category and Notes.

- Autocomplete text input with search icon
- Debounced at 300ms, calls `/api/places/autocomplete`
- Dropdown shows results: place name (bold) + address (secondary text)
- On selection:
  - Fills the field with place name
  - Calls `/api/places/{placeId}` to get details + lat/lng
  - Auto-derives and sets Location from address components (see 1c)
  - Shows a small "x" button to clear
- On clear: removes place data and auto-derived location
- Optional — never required, never blocks form submission

**Legacy trips (IDs 1–4):**
- Show the existing Location dropdown as before
- ALSO show the new Place field (so users can add places to old trip expenses too)
- For legacy trips, Place selection does NOT auto-derive Location (keep manual control)

**All other trips:**
- Hide the Location dropdown entirely
- Location is auto-derived from Place selection (see 1c)
- If no Place is selected, expense has no Location (that's fine)
- Future: consider adding a collapsible "Manual location" section (default collapsed)
  for edge cases like "misc transit" or "street vendor" that don't have a searchable
  place. Show existing auto-derived locations as quick-pick options.

### 1e. Expense Display Changes

**File:** `app/components/receipts/receipt-row.tsx`

In the expanded expense detail section, if `google_place_name` is set:

- **Place name** as a clickable link → opens Google Maps for that place
  (`https://www.google.com/maps/place/?q=place_id:{placeId}`)
- **Google Maps Embed** iframe below the name (using lat/lng):
  ```
  https://www.google.com/maps?q={lat},{lng}&output=embed
  ```
  - Fixed height ~200px, full width, border-radius + hard shadow (neo-brutalist)
  - Lazy-loaded (only renders when expanded)

### 1f. API Changes (Expense CRUD)

**POST `/api/trips/{tripId}/expenses`:**
- Accept new optional fields in request body:
  `google_place_id`, `google_place_name`, `google_place_address`,
  `google_place_lat`, `google_place_lng`
- Insert into expenses table

**PUT `/api/trips/{tripId}/expenses/{expenseId}`:**
- Accept same optional fields
- Allow clearing (set to null) when place is removed
- Update in expenses table

**GET `/api/trips/{tripId}/expenses`:**
- Return new fields in response:
  `googlePlaceId`, `googlePlaceName`, `googlePlaceAddress`,
  `googlePlaceLat`, `googlePlaceLng`

### 1g. Type Changes

**`lib/types.ts` — Expense type:**
```typescript
// Add to Expense type:
googlePlaceId: string | null
googlePlaceName: string | null
googlePlaceAddress: string | null
googlePlaceLat: number | null
googlePlaceLng: number | null
```

**New type for Places API responses:**
```typescript
export type PlacePrediction = {
    placeId: string
    name: string
    address: string
}

export type PlaceDetails = {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
    addressComponents: AddressComponent[]
}

export type AddressComponent = {
    longText: string
    shortText: string
    types: string[]
}
```

### 1h. Environment Variables

- `GOOGLE_MAPS_API_KEY` — already in `.env.local`
- Add to Vercel environment variables for production deployment
- DO NOT expose to the client — only used in API routes (server-side)

### 1i. Implementation Order

1. Migration 00019
2. Type definitions (`lib/types.ts`)
3. API routes (`/api/places/autocomplete`, `/api/places/[placeId]`)
4. Update expense CRUD API (accept + return new fields)
5. Place autocomplete component (reusable)
6. Update expense form (add Place field, conditional Location visibility)
7. Update expense display (place name + map embed)
8. Test end-to-end locally
9. Add `GOOGLE_MAPS_API_KEY` to Vercel env vars
10. Deploy + test on production

---

## Phase 2: Trip Country + Autocomplete Biasing (FUTURE)

- Add `country` TEXT column to `trips` (nullable)
- Country selector on trip create/edit form
- If not set, infer from the first expense with a Google Place
- Pass country/region bias to Places Autocomplete API
  (`locationBias` or `includedRegionCodes` parameter)
- Improves search relevance: "Ichiran" on a Japan trip → Tokyo result, not NYC

---

## Phase 3: Smart Location Derivation Refinements (FUTURE)

- Refine city extraction rules based on real-world testing
- Handle edge cases: Tokyo districts, UK boroughs, etc.
- Possibly allow location override/merge in trip settings
- "Expenses without location" view for backfilling gaps

---

## Phase 4: Replace Legacy Location Workflow (FUTURE)

- Once Google Places is proven:
  - Remove Location dropdown from legacy trips (or keep read-only)
  - Backfill old expenses with Google Places data (manual or batch)
  - Location settings page becomes view-only or merge-only
  - Location model becomes purely derived — no manual creation

---

## Stretch Goals

- **Auto-suggest category** from Google Place type (restaurant → Food, lodging → Accommodation)
- **Trip map view** — all expenses plotted on a single map with pins
- **"Use my location" button** — browser GPS → reverse geocode → suggest place
- **Recently used places** — suggest places already used in the same trip
- **Place photos** — Google Place Photos API on expense detail (costs extra, but $200 credit)

---

## Cost Estimates (at current scale)

| Action | API | Cost | Daily cap |
|--------|-----|------|-----------|
| User types in search | Autocomplete (New) | $2.83/1K sessions | 500/day |
| User picks a result | Place Details (New) | $5.00/1K calls | 500/day |
| View expense map | Maps Embed API | Free | No limit |
| View expense map (JS) | Maps JavaScript API | $7.00/1K loads | Not capped |

Realistic monthly usage: ~200 autocomplete sessions + ~200 detail lookups = ~$1.56/month.
Covered entirely by $200/month free credit. Effectively $0.

---

## Legacy Trip IDs (Hardcoded)

These trips use the manual Location dropdown. All other trips use auto-derived locations.

| ID | Name |
|----|------|
| 1 | Japan 2024 |
| 2 | Vancouver 2024 |
| 3 | South Korea 2025 |
| 4 | Japan 2025 |

If these IDs ever change (e.g., DB reset), update the hardcoded list. This is acceptable
because no new legacy trips will be created — all future trips use Google Places.
