---
name: new-feature
description: Scaffold a new feature (page + API + types) in the Gustavo app following house patterns. Use when adding a new tracker, page, or CRUD resource.
---

# New Feature Scaffold

Read first: `.claude/docs/schema.md` (DB conventions), `lib/colors.ts` header (design
system), `lib/form-styles.ts` header (form styles). Match an existing sibling feature —
the weight tracker (`app/gustavo/health/weight/`, `app/api/health/weight-logs/`) is the
cleanest small example of the full stack.

## Layers (in order)

1. **Migration** — use the `new-migration` skill.

2. **Types** — add to `lib/types.ts` (expense domain) or `lib/health-types.ts` (health).
   camelCase fields; map from snake_case rows in the API layer.

3. **API routes** — `app/api/.../route.ts` (+ `[id]/route.ts` for item ops):
   - Auth: get the session user; health resources are per-user (`user_id = current user`).
   - Expense-domain resources: check permissions via `lib/permissions.ts`.
   - Wrap ALL writes in `withAuditUser(userId, fn)` from `lib/db-audit.ts`.
   - Soft delete: `UPDATE ... SET deleted_at = now()`, never DELETE.
   - Filter every read with `deleted_at IS NULL`.
   - Concurrency: round-trip `updated_at` as the OCC token on edits where it matters.

4. **Frontend fetch** — typed wrappers in `app/utils/api.ts`; React Query keys in
   `lib/query-keys.ts` if the feature uses queries.

5. **Page** — under `app/gustavo/...`:
   - Client components; mobile-first (this is an installed PWA — test narrow widths).
   - Forms: reuse `form-drawer.tsx` / dialog patterns and `lib/form-styles.ts` — do NOT
     invent new form layouts; inputs follow the same visual order as sibling forms.
   - Neo-brutalist styling from `lib/colors.ts` — no ad-hoc colors.
   - Swipeable rows: delete button must look like part of the card (user preference).

6. **Wire navigation** — dashboard row on `app/gustavo/page.tsx` and/or the relevant
   landing page (health features: also `lib/health-section-order.ts`).

7. **Gallery specimens** — add new presentational components (rows, cards, form
   dialogs) to the dev gallery (`app/dev/gallery/`): extend `fixtures.ts` if new mock
   data is needed, add `Specimen` entries to the matching section page (or a new
   section — one page file + a line in `sections` in `gallery-ui.tsx`). Cover the
   interesting states (empty, error, long text), not just the happy path.

8. **Verify** — `pnpm tsc --noEmit`, then actually drive the feature in the browser
   (`pnpm docker:up` + `pnpm dev`); the gallery page is the quick way to eyeball
   component states. Check both light and dark rendering if applicable.

9. **Docs** — schema.md is updated via the migration skill; add the feature to
   `.claude/docs/repo-overview.md`'s app tree if it adds a new page area.
