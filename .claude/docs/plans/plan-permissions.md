# Permissions & Roles Plan

## Overview

Add trip-level roles, visibility controls, category/location ownership, and an admin flag. Expenses inherit permissions from their parent trip — no per-expense permissions. The trip is the trust boundary.

---

## Design

### Trip Participant Roles

Three roles stored in `trip_participants.role`:

| Role | View trip | Edit trip details | Add expense | Edit any expense | Delete any expense | Delete trip | Manage roles |
|------|-----------|-------------------|-------------|------------------|--------------------|-------------|--------------|
| **owner** | Yes | Yes | Yes | Yes | Yes (confirm) | Yes (hard confirm) | Yes |
| **editor** | Yes | Yes | Yes | Yes | Yes (confirm) | No | No |
| **viewer** | Yes | No | Yes | Own only | Own only (confirm) | No | No |

- **Owner** = trip creator. Exactly one per trip. Not transferable (for now).
- **Editor** = can do everything except delete the trip or manage roles.
- **Viewer** = can see everything, can add expenses, but can only edit/delete expenses they reported.
- "Own expense" = `expenses.reported_by` matches the logged-in user's ID.
- All participants (any role) can add new expenses — you're on the trip, you should be able to log what you spent.

### Trip Visibility

New `trips.visibility` column:

| Value | Who can see the trip |
|-------|---------------------|
| `participants` (default) | Only users in `trip_participants` |
| `all_users` | Any authenticated user |

Non-participants viewing a public trip get implicit read-only access (can see trip + expenses, cannot add/edit/delete anything since they're not a participant).

### Category Permissions

Categories are global (not trip-scoped). New `created_by` column on `expense_categories`:

| Action | Who can do it |
|--------|---------------|
| Create | Any authenticated user |
| Edit (rename) | Creator or admin |
| Delete (soft) | Creator or admin |
| View/use in expense form | Any authenticated user |

Soft-deleted categories:
- Disappear from the "create/edit expense" category picker
- Still appear on existing expenses (FK resolves, name still shows)
- Still appear as filter options in the expense list (query joins through the FK regardless of `deleted_at`)
- Can be revived if someone creates a category with the same name (existing behavior)

### Location Permissions

Locations are trip-scoped. Trip roles govern them:

| Action | Who can do it |
|--------|---------------|
| Create | Owner, editor |
| Edit (rename) | Owner, editor |
| Delete (soft) | Owner, editor |
| View/use in expense form | Any trip participant |

Same soft-delete behavior as categories — removed from picker, still shown on existing expenses, still filterable.

Viewers cannot manage locations. They can reference existing locations when adding expenses.

### Admin Flag

Simple `is_admin` boolean on `users` table. Admin overrides:

| Context | Admin can... |
|---------|-------------|
| Trips | Edit/delete any trip, regardless of role (acts as implicit owner) |
| Expenses | Edit/delete any expense in any trip |
| Categories | Edit/delete any category, regardless of creator |
| Locations | Edit/delete any location (if they can access the trip) |

Admin does NOT bypass visibility — a `participants`-only trip is still hidden from non-participant admins. Rationale: if you need to fix someone's trip, add yourself as a participant first (admin can do that). This preserves the trust model while still giving you full power.

**Initial admin:** Set via direct DB update for Ivan's user record. No admin management UI needed.

### User Default Preferences

New columns on `users`:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `default_trip_visibility` | TEXT | `'participants'` | Applied to new trips on creation |
| `default_participant_role` | TEXT | `'viewer'` | Role assigned when adding participants to new trips |

These are creation-time defaults, not live overrides. Changing defaults doesn't affect existing trips.

---

## Permission Resolution Logic

```
canViewTrip(user, trip):
  user is a trip_participant (any role) → YES
  trip.visibility = 'all_users' AND user is authenticated → YES (read-only)
  user.is_admin AND trip.visibility = 'all_users' → YES
  otherwise → NO

canEditTrip(user, trip):
  user.is_admin → YES
  role is 'owner' or 'editor' → YES
  otherwise → NO

canAddExpense(user, trip):
  user is a trip_participant (any role) → YES
  otherwise → NO

canEditExpense(user, trip, expense):
  user.is_admin → YES
  role is 'owner' or 'editor' → YES
  expense.reported_by = user.id → YES
  otherwise → NO

canDeleteExpense(user, trip, expense):
  same as canEditExpense (soft delete, reversible)

canDeleteTrip(user, trip):
  user.is_admin → YES
  role is 'owner' → YES
  otherwise → NO

canManageRoles(user, trip):
  user.is_admin → YES
  role is 'owner' → YES
  otherwise → NO

canManageLocations(user, trip):
  user.is_admin → YES
  role is 'owner' or 'editor' → YES
  otherwise → NO

canEditCategory(user, category):
  user.is_admin → YES
  category.created_by = user.id → YES
  otherwise → NO

canDeleteCategory(user, category):
  same as canEditCategory
```

---

## Migration Plan

### Migration 00012: Permissions

Single migration covering all schema changes:

```sql
-- 1. Add role to trip_participants
ALTER TABLE trip_participants
  ADD COLUMN role TEXT NOT NULL DEFAULT 'editor';

-- Backfill: trip creators become owners
UPDATE trip_participants tp
SET role = 'owner'
FROM trips t
WHERE tp.trip_id = t.id AND tp.user_id = t.created_by;

CREATE INDEX idx_trip_participants_role ON trip_participants (trip_id, role);

-- 2. Add visibility to trips
ALTER TABLE trips
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'participants';

-- 3. Add is_admin to users
ALTER TABLE users
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- 4. Add created_by to expense_categories
ALTER TABLE expense_categories
  ADD COLUMN created_by BIGINT REFERENCES users(id);

-- Backfill: existing categories get no creator (NULL).
-- Admin can edit these. Alternatively, assign to Ivan's user ID:
-- UPDATE expense_categories SET created_by = (SELECT id FROM users WHERE email = 'ivanwong15@gmail.com');

-- 5. Add user default preferences
ALTER TABLE users
  ADD COLUMN default_trip_visibility TEXT NOT NULL DEFAULT 'participants',
  ADD COLUMN default_participant_role TEXT NOT NULL DEFAULT 'viewer';

-- 6. Set initial admin (update with actual user ID)
-- UPDATE users SET is_admin = true WHERE email = 'ivanwong15@gmail.com';
```

Decision: backfill existing categories' `created_by` to Ivan's account (since all current categories were created during development) or leave NULL (admin-editable only). Recommend assigning to Ivan.

---

## Code Changes

### 1. Permission helper — `lib/permissions.ts`

New module with pure functions + a DB lookup helper:

```ts
type Role = 'owner' | 'editor' | 'viewer'

// Pure permission checks
canEditTrip(role: Role | null, isAdmin: boolean): boolean
canDeleteTrip(role: Role | null, isAdmin: boolean): boolean
canAddExpense(role: Role | null): boolean
canEditExpense(role: Role | null, isAdmin: boolean, isReporter: boolean): boolean
canDeleteExpense(role: Role | null, isAdmin: boolean, isReporter: boolean): boolean
canManageRoles(role: Role | null, isAdmin: boolean): boolean
canManageLocations(role: Role | null, isAdmin: boolean): boolean
canEditCategory(isAdmin: boolean, isCreator: boolean): boolean
canDeleteCategory(isAdmin: boolean, isCreator: boolean): boolean

// DB helper — returns user's role + admin status
getUserTripRole(userId: number, tripId: number): Promise<{
  role: Role | null       // null if not a participant
  isAdmin: boolean
}>
```

### 2. Auth helper update — `lib/api-helpers.ts`

Extend `requireAuthWithUserId` to also return `isAdmin`:

```ts
// Returns { email, userId, isAdmin }
requireAuthWithUserId(): Promise<{ email: string; userId: number; isAdmin: boolean } | null>
```

### 3. API route changes

#### Trips

**GET /api/trips** (trip list)
- Filter by visibility + participation:
  ```sql
  WHERE deleted_at IS NULL
    AND (visibility = 'all_users'
         OR id IN (SELECT trip_id FROM trip_participants
                   WHERE user_id = $1 AND left_at IS NULL))
  ```
- Include `userRole` in each trip response (owner/editor/viewer/null).

**GET /api/trips?slug=...** (single trip)
- Same visibility check. Return 404 for hidden trips.
- Include `userRole` and `isAdmin` in response.

**POST /api/trips** (create)
- Read user's `default_trip_visibility` and apply to new trip.
- Set creator's role to `owner`.
- Read user's `default_participant_role` and apply to added participants.

**PUT /api/trips/[tripId]** (edit)
- Check `canEditTrip(role, isAdmin)`. Return 403 if denied.

**DELETE /api/trips/[tripId]** (delete)
- Check `canDeleteTrip(role, isAdmin)`. Return 403 if denied.

#### Expenses

**POST /api/trips/[tripId]/expenses** (create)
- Check `canAddExpense(role)`. Return 403 if not a participant.

**PUT /api/trips/[tripId]/expenses/[expenseId]** (edit)
- Look up `expense.reported_by` to determine `isReporter`.
- Check `canEditExpense(role, isAdmin, isReporter)`. Return 403 if denied.

**DELETE /api/trips/[tripId]/expenses/[expenseId]** (delete)
- Same check as edit.

#### Locations

**POST /api/trips/[tripId]/locations** (create)
- Check `canManageLocations(role, isAdmin)`. Return 403 if denied.

**PUT /api/trips/[tripId]/locations/[id]** (edit)
- Same check.

**DELETE /api/trips/[tripId]/locations/[id]** (delete)
- Same check.

#### Categories

**POST /api/expense-categories** (create)
- Any authenticated user (no change).
- Set `created_by` to current user ID.

**PUT /api/expense-categories/[id]** (edit)
- Look up `category.created_by`.
- Check `canEditCategory(isAdmin, isCreator)`. Return 403 if denied.

**DELETE /api/expense-categories/[id]** (delete)
- Same check as edit.

#### New: Role management

**PUT /api/trips/[tripId]/participants/[userId]/role**
- Check `canManageRoles(role, isAdmin)`. Return 403 if denied.
- Body: `{ role: 'editor' | 'viewer' }` (cannot assign `owner`).
- Cannot change your own role.

### 4. Frontend changes

#### API response shape updates

Trip responses include new fields:
```ts
{
  ...existingFields,
  visibility: 'participants' | 'all_users',
  userRole: 'owner' | 'editor' | 'viewer' | null,  // null = non-participant viewing public trip
  isAdmin: boolean,
}
```

#### Conditional UI rendering

Pass `userRole` and `isAdmin` through the existing trip data provider. Components check permissions to show/hide actions:

- **Trip list**: edit/delete buttons based on role.
- **Trip detail header**: edit trip button hidden for viewers (unless admin). Delete button only for owner/admin.
- **Expense rows**: edit/delete actions shown based on `canEditExpense` (role + isReporter check).
- **Add expense button**: visible for all participants (any role). Hidden for non-participant viewers of public trips.
- **Location management**: settings page restricted to owner/editor/admin.
- **Category management**: edit/delete buttons only shown for creator or admin.

#### Trip form dialog

- Add visibility toggle: "Participants only" / "All users".
- Default value from user preferences.

#### Participant management (trip settings)

- Show role badge (owner/editor/viewer) next to each participant.
- Owner/admin sees role selector dropdown to change others' roles.
- Non-owners see roles as read-only badges.

#### User settings/preferences

New section on the settings page:
- Default trip visibility: participants / all users
- Default participant role: editor / viewer

#### Delete confirmations

- **Trip deletion** (owner/admin only): type-to-confirm dialog. User must type the trip name to enable the delete button.
- **Expense deletion**: standard confirmation dialog (already exists, no change needed).

### 5. Filter behavior for soft-deleted categories/locations

The expense list filter UI should show all categories/locations that are referenced by active expenses, including soft-deleted ones. Change the filter query from:

```sql
-- Current: only active categories
SELECT DISTINCT ec.name FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
WHERE e.trip_id = $1 AND e.deleted_at IS NULL AND ec.deleted_at IS NULL
```

To:

```sql
-- New: any category referenced by active expenses (regardless of category deleted_at)
SELECT DISTINCT ec.id, ec.name FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
WHERE e.trip_id = $1 AND e.deleted_at IS NULL
ORDER BY ec.name
```

Same pattern for locations. The expense picker (create/edit form) still filters by `deleted_at IS NULL`.

---

## Implementation Order

### Phase 1: Schema + permissions core
1. Migration 00012 (role, visibility, is_admin, created_by, user prefs)
2. `lib/permissions.ts` — permission helper functions
3. Update `lib/api-helpers.ts` — include `isAdmin` in auth result

### Phase 2: API hardening
4. Trip API routes — add permission checks + visibility filtering
5. Expense API routes — add permission checks (role + isReporter)
6. Location API routes — add permission checks
7. Category API routes — add permission checks + `created_by` on create
8. New role management endpoint

### Phase 3: Frontend — conditional UI
9. Trip data provider — pass `userRole`, `isAdmin` through context
10. Conditional rendering of edit/delete buttons across all views
11. Trip form — visibility toggle
12. Participant management — role badges + role selector for owner

### Phase 4: Frontend — settings + polish
13. User settings page — default visibility + default participant role
14. Type-to-confirm dialog for trip deletion
15. Filter queries updated for soft-deleted categories/locations

Phases 1-2 can ship together (backend-only, no visible change). Phases 3-4 are incremental UI work.

---

## What's NOT included (intentional)

- **Groups** — deferred. <10 users; individual role assignment is just as fast. Easy to add later.
- **Per-expense permissions** — expenses inherit from trip. Debt calculations require full visibility within a trip.
- **Ownership transfer** — not needed yet. Add later if requested.
- **Public/unauthenticated access** — "all_users" means all authenticated users, not the public internet.
- **Invite system** — participants are added directly. No invite links or accept/decline flow.
- **Admin management UI** — admin is set via DB. Only one admin (Ivan) for the foreseeable future.
- **Admin bypassing trip visibility** — admin must be a participant to see a `participants`-only trip. Add yourself first.
