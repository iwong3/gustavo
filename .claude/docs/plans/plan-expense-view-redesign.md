# Expense View Redesign

## Summary

Replace the current expand-in-place expense cards with a compact row list + bottom-up detail drawer. The list becomes denser and scannable; tapping a row opens a drawer with rich details, map, actions, and room for future features.

**Implementation principle**: Each drawer section/feature is a self-contained component, easy to reorder, toggle, or remove during iteration.

### Design Guidelines

- **Neo-brutalist consistency**: Every component should use hard borders (`1px solid primaryBlack`), offset box shadows (`2px 2px 0px`), warm off-white backgrounds, and yellow accents. Use `cardSx`, `hardShadow`, and existing design tokens from `lib/colors.ts` and `lib/form-styles.ts`. No soft shadows, no blur, no rounded-everything.
- **Alignment discipline**: Vertically center all row content (icons, text, chips). Horizontally center standalone elements (donut chart, boba callout, position labels). Use consistent symmetric padding/margins — prefer `px: 2, py: 1.5` patterns over ad-hoc values.
- **Wow first, intuitive second**: Prioritize visual delight and personality (the boba comparison, the donut chart, the day context strip). But never at the cost of clarity — every interaction should feel obvious after the first use. Animations should be quick (150-250ms), purposeful, and smooth.
- **Graceful edge cases**: Handle missing data elegantly — no "null" text, no empty sections, no layout shifts. If a Google Place has no rating, skip it (don't show "N/A"). If an expense has no notes, don't render the notes section at all. Conversion errors get a clear but non-alarming warning treatment.
- **Satisfying interactions**: Taps should have immediate visual feedback. Drawer open/close should feel weighty and physical. Swipe actions should have resistance and snap. Transitions between expenses in the drawer should feel like flipping cards, not loading pages.

---

## Current State

- Expense cards expand inline via `AnimateHeight`
- Collapsed: category icon | name + date/location | cost + payer avatar
- Expanded: split details, currency exchange info, Google Place + embedded map iframe, receipt image, notes, reported-by, edit/delete actions
- No grouping — flat list with filter/sort controls

## Proposed State

Two-part design: **compact rows** (scannable list) + **detail drawer** (rich, full-width bottom sheet).

---

## Part 1: Compact Expense Row

### Priority info (always visible)

| Element | Why | Position |
|---------|-----|----------|
| **Expense name** | Primary identifier | Left, bold |
| **Date** | Scanning/grouping anchor | Left, below name (subtle) |
| **Cost (USD)** | The number people care about most | Right, bold |
| **Payer initials** | "Who paid?" at a glance | Right, avatar circle |

### Secondary info (visible but subtle)

| Element | Why | Position |
|---------|-----|----------|
| **Category icon** | Visual anchor, quick scanning | Far left (colored circle, keep current) |
| **Location or Google Place name** | Disambiguates similar expenses | Below name, after date, truncated |
| **Split indicator** | "Is this just me or shared?" | Small chip near payer (see below) |
| **Conversion error badge** | Needs attention | Small warning dot on cost |

### Row layout sketch (mobile, ~375px)

```
┌─────────────────────────────────────────────┐
│ [🍽] Ichiran Ramen              ¥1,200  $8.50│
│      3/5 · Shibuya        ÷3    paid: GR    │
└─────────────────────────────────────────────┘
```

- Category icon (32px circle, colored) on the far left
- Name bold, single line, truncated with ellipsis
- Date + location on second line, muted color, `·` separator
- Cost right-aligned, bold — show original currency + USD if foreign
- Payer avatar small (20-24px) right-aligned on second line
- If conversion error: red left border accent (instead of full red background — subtler)
- Entire row tappable → opens detail drawer

### Row enhancements

- **Split count chip**: tiny `÷3` or `÷all` badge — instantly know the split without opening the drawer
- **Covered indicator**: if someone is covered, a tiny gift icon next to the split count
- **"You paid" highlight**: if current user is the payer, subtle yellow left border or background tint — makes scanning for "my expenses" instant

### Decision: splitee icons in row?

Showing splitee avatar circles (like the trip participant row) could be useful but risks clutter on a compact mobile row. Options:
- Skip in row, show prominently in drawer (recommended for v1)
- Show only if ≤3 splitees, collapse to `+N` otherwise
- Show on wider screens only (responsive)

Decide after seeing the drawer implementation — the row may not need them if the drawer is easy to open.

---

## Part 2: Date Grouping

### Default: group by date

Expenses grouped under date headers, most recent date first. Within a date group, most recently entered first (by `reported_at` or `id` DESC — no time-of-day on expense `date`).

```
── March 5, 2025 (Day 3 of 14) ───── $86.20
  [🍽] Ichiran Ramen                    $8.50
  [🚃] Suica Top-up                   $20.00
  [🎭] TeamLab Borderless             $32.00
  [🍺] Shibuya Izakaya                $25.70

── March 4, 2025 (Day 2 of 14) ───── $56.80
  [🏨] Hotel (2 nights)               $45.00
  [🍽] Convenience Store              $11.80
```

- Date header shows the day total (USD)
- "Day X of Y" label derived from trip start/end dates
- Collapsible date groups (tap header to collapse/expand a whole day)
- Today/Yesterday labels where applicable

### Alternative groupings (future, via a toolbar toggle)

- **By category**: all Food together, all Transport together, etc.
- **By payer**: see who's been paying what
- **By location**: cluster by city/area
- **No grouping**: flat list (current behavior, for power users)

---

## Part 3: Detail Drawer

Bottom-up drawer (MUI `SwipeableDrawer` or similar). Slides up from bottom, draggable handle at top, backdrop dims the list behind it.

### Drawer height behavior

- **Default open**: ~60-70% of screen height
- **Swipe up**: expand to ~95% (near full screen) for map/long content
- **Swipe down**: dismiss
- **Snap points**: collapsed (dismissed), half, full

### Architecture: modular sections

Each section below is a standalone component (`<DrawerHeader>`, `<DrawerCostSection>`, `<DrawerSplitSection>`, etc.). The drawer assembles them in order. To reorder, move the component. To remove, delete the line. To toggle, use a feature flag or just comment out.

```tsx
// expense-detail-drawer.tsx
<DrawerHeader expense={expense} onEdit={...} onDelete={...} />
<DrawerCostSection expense={expense} />
<DrawerSplitSection expense={expense} tripParticipants={...} currentUserId={...} />
<DrawerDayContext expenses={dayExpenses} currentExpenseId={expense.id} />
<DrawerMapSection expense={expense} />
<DrawerPlaceMetadata expense={expense} />
<DrawerNotes expense={expense} />
<DrawerPayerProfile payer={expense.paidBy} tripExpenses={allExpenses} />
<DrawerMetadataFooter expense={expense} onFilterByCategory={...} onFilterByLocation={...} />
```

### Navigation within drawer

- **Next/previous arrows** (or swipe left/right on drawer content) to move between expenses without closing
- **Day context strip**: thin horizontal strip showing dots/blocks for each expense that day, current one highlighted. Shows position and enables quick jumps.
- **Position label**: "Expense 12 of 47 · Day 3 of 14"

### Section details

#### 1. Header Section

```
┌─────────────────────────────────────────────┐
│  ━━━  (drag handle)                         │
│                                             │
│  🍽  Ichiran Ramen                    [✏][🗑]│
│  Shibuya · Food                             │
│  Expense 12 of 47 · Day 3 of 14            │
└─────────────────────────────────────────────┘
```

- Large category icon (48-64px) with name beside it
- Edit/delete action icons in the top right (permission-gated)
- Location + category label below name
- Position/day label in muted text

#### 2. Cost Section

```
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│         ¥1,200          $8.50               │
│    original cost      converted             │
│              rate: 1 USD = 141.2 JPY        │
│                                             │
│    ☕ ≈ 1.4 bobas                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
```

- Prominent display of both original and converted amounts
- Exchange rate shown if foreign currency
- If conversion error: warning banner with explanation
- **Fun comparisons**: "≈ X bobas" or "≈ X coffees" — configurable reference item, lighthearted context. User picks their reference in settings (default: boba at ~$6). Pure fun, easily removable.

#### 3. Split Section

```
│  Split between 3 people            ÷ $2.83  │
│                                             │
│  [GR] Gustavo  ·  paid             $2.83   │
│  [IV] Ivan                          $2.83   │
│  [MR] Maria    ·  covered 🎁        $0.00   │
│                                             │
│  [====donut chart====]                      │
│                                             │
│  💰 You owe Gustavo $2.83                   │
```

- Each participant on their own line with their share
- Payer clearly labeled
- Covered participants shown with gift icon + $0.00 share
- If "everyone": show "Everyone (5 people)" with expandable list
- **Donut/pie chart**: segments per person, colored by their `iconColor`. Covered participants' slices shown with a hatched/striped pattern absorbed into the payer's slice. Hard segments (no gradients) for neo-brutalist style.
- **"You owe" callout**: prominent chip showing the current user's debt from this expense. The one number most people care about.

#### 4. Day Context Strip

```
│  ── March 5, 2025 ──────────────────────── │
│  [·][·][●][·][·][·][·]                     │
│   ↑ current expense (3 of 7 today)         │
```

- Thin horizontal row of dots/blocks, one per expense that day
- Current expense highlighted (filled dot, different color, or larger)
- Tappable — tap a dot to jump to that expense in the drawer (next/prev shortcut)
- Shows "3 of 7 today" label
- Gives spatial context: "this was a mid-day expense, there were 4 more after"

#### 5. Map Section (if Google Place exists)

```
│  📍 Ichiran Ramen Shibuya           [↗ Maps]│
│     1-22-7 Jinnan, Shibuya City             │
│  ┌─────────────────────────────────────────┐│
│  │                                         ││
│  │          (embedded map)                 ││
│  │           ~250px tall                   ││
│  │                                         ││
│  └─────────────────────────────────────────┘│
```

- Larger map than current (250px vs 180px) — drawer gives us room
- Place name + full address above the map
- "Open in Maps" button/link (opens Google Maps with place ID)
- Map has neo-brutalist border treatment (hard shadow)
- Consider static map image (Google Static Maps API, free tier) instead of iframe — faster load, no jank

#### 6. Place Metadata Section (if Google Place exists)

```
│  💲💲  ·  4.2★  ·  Japanese Restaurant     │
│  🕐 Open until 11:00 PM                    │
```

- **Price level**: `$` to `$$$$` from Google Places
- **Rating**: star rating from Google Places
- **Type/cuisine**: primary place type, humanized
- **Hours**: current open/close status if available
- Only show fields that exist — no empty placeholders
- Requires storing additional Places API fields (see Technical section)

**Also visited**: If multiple expenses share the same Google Place, show "You visited here 3 times" with links to other expenses at this place.

#### 7. Notes Section

```
│  📝 Notes                                   │
│  "Best ramen we had the entire trip.        │
│   Ask for extra noodles (kaedama)."         │
```

- Only shown if notes exist
- Styled as a quote block or card with neo-brutalist border

#### 8. Payer Profile Card

```
│  👤 Paid by Gustavo                         │
│     23 expenses · $1,240 total this trip    │
│     [Venmo →]                               │
```

- Payer avatar + name + trip stats (expense count, total paid)
- Venmo link if available — quick settlement access
- **Share history with payer**: "Ivan has been covered by Gustavo 3 times ($45 total)" — context for the covered-participants feature
- Stats computed from all trip expenses (passed in as prop)

#### 9. Metadata Footer

```
│  ─────────────────────────────────────────  │
│  Submitted by Ivan · Mar 5 at 2:15 PM      │
│  [Food] [Shibuya]                           │
└─────────────────────────────────────────────┘
```

- Subtle, muted text
- Reporter + timestamp
- **Category and location as tappable chips**: tap → close drawer → filter the expense list by that value. Quick way to see "all Food expenses" or "all Shibuya expenses."

---

## Part 4: Creative / Stretch Ideas

These are additional explorations beyond the core drawer. Each is independent.

### List-level visual ideas

1. **Daily spending sparkline**: in the date group header, a tiny sparkline showing spending pattern for that day. Pure visual flavor.

2. **"Trip timeline" alternate view**: vertical timeline with date nodes, expenses hanging off each node. More visual, less data-dense — good for trip recaps/storytelling. Toggle between "list view" and "timeline view."

3. **Expense heatmap calendar**: small calendar grid showing spending intensity per day (darker = more spent). Tap a day to jump to that date group. Useful for long trips.

4. **Running total**: cumulative trip spend as a subtle counter that updates as you scroll. "You've scrolled past $1,247 of expenses."

5. **Category summary strip**: horizontal scrollable row of category pills at the top showing totals. `🍽 Food $342 | 🚃 Transport $180 | 🏨 Hotels $520`. Tapping one filters to that category.

### Interaction ideas

6. **Swipe actions on rows**: swipe left → delete (red background), swipe right → edit (yellow background). Keep buttons in drawer too for discoverability.

7. **Long-press for quick actions**: context menu with edit, delete, duplicate. Alternative to swipe if swipe feels too destructive.

8. **Pull-to-refresh**: pull down the expense list to refresh data from server. Standard mobile pattern.

9. **Tap category icon to filter**: tapping a category icon in the row instantly filters the list to that category.

10. **Duplicate expense action**: in drawer or long-press menu, one-tap to create a new expense pre-filled with this one's data. Useful for recurring expenses (daily transit, similar meals).

### Data/insight ideas

11. **"Who owes whom" summary card**: at the top of the expense list, show net balances. "Ivan owes Gustavo $34.20. Settle via Venmo →". Already exists elsewhere, but surfacing here adds context.

12. **Per-person spending breakdown**: in the drawer, each person's running total with this payer. "Is this split fair?" context.

13. **Exchange rate tracker** (trip details page, not drawer): for multi-currency trips, a chart showing how the exchange rate moved during the trip. Mark each expense's rate on the chart. "You paid 2.3% above market rate today."

14. **Expense patterns**: "You've eaten out 5 days in a row" or "Transport is 40% of today's spending." Fun insights, not critical.

### Map/location ideas

15. **Trip map view**: toggle to see ALL expenses plotted on a map. Cluster markers for nearby expenses. Tap a marker to open the detail drawer. Great for trip recaps.

16. **"Expenses near me"**: if user shares location, highlight expenses near their current position. Useful during active trips.

17. **Route visualization**: connect expenses chronologically on the map to show the trip route. Storytelling/recap feature.

18. **Place photo header**: Google Places Photos API returns venue photos. Use as a subtle banner at the top of the drawer behind the expense name (dark gradient overlay for readability). Free tier: ~1,000 requests/month.

### Social/people ideas

19. **"Your share history" with payer**: "Ivan has been covered by Gustavo 3 times this trip ($45 total)." Contextualizes the covered-participants feature.

20. **"Nearby expenses" in drawer**: "2 other expenses within 500m of this place" — tap to see them. Fun for trip recaps.

---

## Technical Approach

### Components to create/modify

| Component | Action | Notes |
|-----------|--------|-------|
| `receipt-row.tsx` | **Rewrite** | Slim down to compact row, remove all expanded content |
| `receipts-list.tsx` | **Modify** | Add date grouping logic, group headers |
| New: `expense-detail-drawer.tsx` | **Create** | Bottom drawer, assembles modular sections |
| New: `drawer-header.tsx` | **Create** | Name, icon, actions, position label |
| New: `drawer-cost-section.tsx` | **Create** | Original + converted cost, exchange rate, fun comparison |
| New: `drawer-split-section.tsx` | **Create** | Participant list, donut chart, "you owe" callout |
| New: `drawer-day-context.tsx` | **Create** | Day strip with dots, position label |
| New: `drawer-map-section.tsx` | **Create** | Map embed/static image, place info |
| New: `drawer-place-metadata.tsx` | **Create** | Price level, rating, type, hours |
| New: `drawer-notes.tsx` | **Create** | Notes quote block |
| New: `drawer-payer-profile.tsx` | **Create** | Payer stats, Venmo link, share history |
| New: `drawer-metadata-footer.tsx` | **Create** | Reporter, timestamp, filter chips |
| New: `date-group-header.tsx` | **Create** | Collapsible date header with day total |
| `split-between-initials.tsx` | **Modify** | Reuse in drawer split section |
| `AnimateHeight` usage | **Remove** | No longer needed for row expansion |

### Database: `place_details` table

Normalize Google Place data into a separate table. Benefits:
- Deduplicates when multiple expenses reference the same place ("also visited" becomes a simple join)
- Keeps expenses table clean (replace 5+ `google_place_*` columns with one FK)
- Easy to extend with more fields later

**Schema:**
```sql
CREATE TABLE place_details (
    google_place_id    TEXT PRIMARY KEY,   -- Google's place ID, natural key
    name               TEXT NOT NULL,
    address            TEXT,
    lat                DOUBLE PRECISION,
    lng                DOUBLE PRECISION,
    price_level        INTEGER,            -- 0-4, nullable
    rating             DECIMAL(2,1),       -- e.g. 4.2, nullable
    primary_type       TEXT,               -- e.g. 'japanese_restaurant'
    types              JSONB,              -- full types array
    website            TEXT,
    hours_json         JSONB,              -- regularOpeningHours structure
    photo_refs         JSONB,              -- array of photo resource names
    fetched_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Migration plan:**
1. Create `place_details` table
2. Migrate existing `google_place_*` data from expenses into `place_details`
3. Replace `google_place_id`, `google_place_name`, `google_place_address`, `google_place_lat`, `google_place_lng` columns on expenses with single `google_place_id TEXT REFERENCES place_details(google_place_id)`
4. Update API routes + types

**Places API field mask update:**
```
Current:  id,displayName,formattedAddress,location,addressComponents,types,primaryType
New:      id,displayName,formattedAddress,location,addressComponents,types,primaryType,
          priceLevel,rating,regularOpeningHours,websiteUri,photos
```

All data fetched in the single existing `getPlaceDetails()` call when the user selects a place in autocomplete. No additional API requests needed.

### Boba comparison

Hardcoded: 1 boba = $6.50, shown with 🧋 emoji. Configurable via settings later.

Formula: `Math.round((costConvertedUsd / 6.50) * 10) / 10` → "≈ 1.3 bobas"

### "Also visited" and "nearby expenses"

Shown as collapsible sections at the bottom of the drawer (below notes, above metadata footer). Collapsed by default — supplementary context, not primary info.

### Receipt images

Keep `receiptImageUrl` field in DB and types. Don't render in the new drawer components. Code stays for potential future Google Photos integration.

### Libraries to consider

- **MUI `SwipeableDrawer`**: already using MUI. Free.
- **Donut chart**: custom SVG component (no library needed for simple pie/donut). Hard segments, no gradients, neo-brutalist style.
- **Google Static Maps API**: free tier sufficient for our scale. No library needed, just `<img src>`.
- **`@vis.gl/react-google-maps`**: for interactive trip map view (stretch). Free with API key.

### Migration strategy

See Implementation Checklist below for the full ordered task list.

---

## Resolved Questions

- **Date grouping in URL?** — No, skip for now.
- **Fun comparison item?** — Hardcoded boba at $6.50 with 🧋. Configurable later.
- **"Also visited" / "nearby expenses" placement?** — Collapsible sections at bottom of drawer.
- **Receipt images?** — Keep DB field, don't render in new UI. Potential Google Photos integration later.
- **Place metadata storage?** — Separate `place_details` table with `google_place_id` as PK.
- **When to fetch place data?** — All at selection time via expanded field mask. One API call, stored upfront.

## Open Questions

- [ ] Splitee icons in compact row: skip for v1, show only in drawer? Or show for ≤3 splitees?
- [ ] Swipe actions: swipe-to-delete feels destructive on mobile. Require confirmation or just swipe-to-reveal buttons?
- [ ] Trip map view: implement as part of this redesign or separate feature?
- [ ] Place photos: use as drawer header banner? Check Places Photos API cost at our scale.

---

## Implementation Checklist

### 1. Database: `place_details` table migration
- [ ] Create migration: `place_details` table with schema (google_place_id PK, name, address, lat, lng, price_level, rating, primary_type, types, website, hours_json, photo_refs, fetched_at)
- [ ] Migrate existing `google_place_*` data from expenses into `place_details`
- [ ] Drop old columns (`google_place_name`, `google_place_address`, `google_place_lat`, `google_place_lng`) from expenses
- [ ] Keep `google_place_id` on expenses as FK to `place_details`
- [ ] Run migration locally and verify data integrity

### 2. Places API: expanded field mask + storage
- [ ] Update `FIELD_MASK` in `app/api/places/[placeId]/route.ts` to include `priceLevel,rating,regularOpeningHours,websiteUri,photos`
- [ ] Update API response to return new fields
- [ ] Update `PlaceDetails` type in `lib/types.ts` with new fields (priceLevel, rating, hours, website, photoRefs)
- [ ] Update expense creation/edit flow to upsert into `place_details` table when a place is selected
- [ ] Update expense queries to JOIN `place_details` and return full place data
- [ ] Verify autocomplete → place selection → save still works end-to-end

### 3. Compact expense row (rewrite `receipt-row.tsx`)
- [ ] Category icon (32px colored circle) on far left
- [ ] Expense name — bold, single line, truncated with ellipsis
- [ ] Date + location on second line, muted color, `·` separator
- [ ] Cost right-aligned, bold
  - [ ] Show original currency + USD if foreign currency
- [ ] Payer avatar (20-24px) right-aligned on second line
- [ ] Split count chip (`÷3` or `÷all`)
  - [ ] Covered indicator: gift icon next to split count if anyone is covered
- [ ] "You paid" highlight: subtle yellow left border/tint if current user is the payer
- [ ] Conversion error: red left border accent
- [ ] Entire row tappable → opens detail drawer
- [ ] Remove all old expanded content and `AnimateHeight` usage

### 4. Date grouping
- [ ] Group expenses by date, most recent date first
- [ ] Within a date group, order by `id` DESC (most recently entered first)
- [ ] Date group header component (`date-group-header.tsx`)
  - [ ] Date label (e.g. "March 5, 2025")
  - [ ] "Day X of Y" label (derived from trip start/end dates)
  - [ ] Day total in USD
  - [ ] Today/Yesterday labels where applicable
  - [ ] Tap header to collapse/expand the entire day's expenses

### 5. Detail drawer shell (`expense-detail-drawer.tsx`)
- [ ] Bottom-up MUI `SwipeableDrawer`
- [ ] Drag handle at top
- [ ] Snap points: dismissed, ~60-70% height, ~95% height
- [ ] Swipe down to dismiss
- [ ] Swipe up to expand to near-full-screen
- [ ] Backdrop dims the list behind it
- [ ] Scrollable content area for long content
- [ ] Assembles modular section components in order

### 6. Drawer section: Header (`drawer-header.tsx`)
- [ ] Large category icon (48-64px)
- [ ] Expense name beside icon
- [ ] Edit button (permission-gated via `canEditExpense`)
- [ ] Delete button (permission-gated via `canDeleteExpense`)
- [ ] Location + category label below name
- [ ] Position label: "Expense X of Y · Day X of Y"

### 7. Drawer section: Cost (`drawer-cost-section.tsx`)
- [ ] Original cost (large, prominent)
- [ ] Converted USD cost (large, prominent)
- [ ] Exchange rate (if foreign currency): "rate: 1 USD = X.XX [currency]"
- [ ] Conversion error: warning banner with explanation
- [ ] Boba comparison: "🧋 ≈ X.X bobas" (hardcoded $6.50 per boba)
  - [ ] Singular "boba" when ≈ 1.0, plural "bobas" otherwise
  - [ ] Skip if cost is $0

### 8. Drawer section: Split (`drawer-split-section.tsx`)
- [ ] Header: "Split between N people" + per-person share amount
- [ ] Participant list — each person on their own line:
  - [ ] Avatar circle with initials
  - [ ] Name
  - [ ] "paid" label for payer
  - [ ] Share amount
  - [ ] "covered 🎁" label + $0.00 for covered participants
- [ ] "Everyone (N people)" label with expandable list when `isEveryone` is true
- [ ] Donut/pie chart:
  - [ ] Segments per person, colored by `iconColor`
  - [ ] Hard segments (no gradients) — neo-brutalist style
  - [ ] Covered participants' slices shown with hatched/striped pattern absorbed into payer's slice
  - [ ] Custom SVG component (no charting library)
- [ ] "You owe" callout:
  - [ ] Prominent chip showing current user's debt from this expense
  - [ ] Only shown if current user is a participant but NOT the payer

### 9. Drawer section: Day Context Strip (`drawer-day-context.tsx`)
- [ ] Thin horizontal row of dots/blocks, one per expense that day
- [ ] Current expense highlighted (filled/larger dot)
- [ ] Tappable dots — tap to jump to that expense in the drawer
- [ ] "X of Y today" label
- [ ] Date label: "March 5, 2025"

### 10. Drawer section: Map (`drawer-map-section.tsx`)
- [ ] Only rendered if expense has a Google Place
- [ ] Place name + full address above map
- [ ] "Open in Maps" link/button (opens Google Maps with place ID, new tab)
- [ ] Map embed (~250px tall)
  - [ ] Try static map image (Google Static Maps API) first
  - [ ] Fall back to iframe embed if no API key configured
- [ ] Neo-brutalist border treatment (hard shadow)

### 11. Drawer section: Place Metadata (`drawer-place-metadata.tsx`)
- [ ] Only rendered if expense has a Google Place with metadata
- [ ] Price level: `$` to `$$$$` display
- [ ] Rating: star rating (e.g. "4.2★")
- [ ] Type/cuisine: primary place type, humanized (e.g. "japanese_restaurant" → "Japanese Restaurant")
- [ ] Hours: open/close status if available
- [ ] Only show fields that have data — no empty placeholders
- [ ] "Also visited" collapsible section:
  - [ ] Count of other expenses at the same Google Place
  - [ ] Links to those expenses (tap to navigate drawer to them)
  - [ ] Collapsed by default

### 12. Drawer section: Notes (`drawer-notes.tsx`)
- [ ] Only rendered if `expense.notes` exists and is non-empty
- [ ] Styled as a quote block or card with neo-brutalist border

### 13. Drawer section: Payer Profile (`drawer-payer-profile.tsx`)
- [ ] Payer avatar + name
- [ ] Trip stats: "X expenses · $Y total this trip" (computed from all trip expenses)
- [ ] Venmo link button (if payer has `venmoUrl`)
- [ ] "Share history with payer" collapsible section:
  - [ ] "Ivan has been covered by Gustavo X times ($Y total)" — if applicable
  - [ ] Collapsed by default

### 14. Drawer section: Metadata Footer (`drawer-metadata-footer.tsx`)
- [ ] Reporter name + timestamp ("Submitted by Ivan · Mar 5 at 2:15 PM")
- [ ] Category chip (tappable → close drawer → filter list by category)
- [ ] Location chip (tappable → close drawer → filter list by location)

### 15. Drawer navigation: next/previous
- [ ] Next/previous arrows (or swipe left/right on drawer content)
- [ ] Navigate between expenses without closing the drawer
- [ ] Update all drawer sections when navigating
- [ ] Wrap around or disable at first/last expense

### 16. Swipe actions on rows
- [ ] Swipe left → reveal delete action (red background)
- [ ] Swipe right → reveal edit action (yellow background)
- [ ] Permission-gated (only show if user can edit/delete)
- [ ] Keep edit/delete buttons in drawer too for discoverability

### 17. Cleanup
- [ ] Remove `AnimateHeight` component usage from expense rows
- [ ] Remove `useCollapseAllStore` (no longer needed — no inline expand/collapse)
- [ ] Remove old expanded content from `receipt-row.tsx`
- [ ] Don't render receipt image in any new components (keep DB field)
- [ ] Verify existing filters/sorts still work with new row + grouping
- [ ] Verify expense form dialog (add/edit) still opens correctly from drawer actions
- [ ] Verify delete confirmation dialog still works from drawer actions

### 18. Stretch: Nearby expenses in drawer
- [ ] "X other expenses within 500m" section
- [ ] Computed from all trip expenses with Google Place lat/lng
- [ ] Collapsible, collapsed by default
- [ ] Tap to navigate drawer to that expense

### 19. Stretch: List-level enhancements
- [ ] Daily spending sparkline in date group header
- [ ] Category summary strip (horizontal scrollable pills with totals)
- [ ] Running total counter (cumulative spend as you scroll)
- [ ] Tap category icon in row to filter
- [ ] Long-press row for quick actions context menu (edit, delete, duplicate)
- [ ] Pull-to-refresh on expense list
- [ ] Duplicate expense action (in drawer or context menu)

### 20. Stretch: Trip map view
- [ ] Toggle to see all expenses plotted on a map
- [ ] Cluster markers for nearby expenses
- [ ] Tap marker → open detail drawer for that expense
- [ ] Route visualization (connect expenses chronologically)

### 21. Stretch: Place photo header
- [ ] Fetch place photo via Google Places Photos API
- [ ] Show as banner image at top of drawer (behind expense name)
- [ ] Dark gradient overlay for text readability
- [ ] Verify cost at our usage scale

### 22. Stretch: Exchange rate tracker (trip details page)
- [ ] Chart showing exchange rate over trip duration
- [ ] Mark each expense's rate on the chart
- [ ] "You paid X% above/below market rate" annotations
