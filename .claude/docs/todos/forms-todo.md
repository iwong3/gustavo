# Forms — page-style migration checklist

Convention: `.claude/docs/code-guide.md` § Page-style Forms. Every add/edit form
becomes its own route rendered through `FormPage` (+ `FormDateField` for dated
entries), gets a back-button rule in `app/gustavo/layout.tsx`, and a chip in
`/dev/gallery/forms`. Delete confirmations stay dialogs.

Inventory taken Sept 2026 — every add/edit/delete surface in the app.

## Done

- [x] Expense add / edit — `components/expense-form.tsx` (the reference)
- [x] Trip create / edit — `components/trip-form.tsx`
- [x] Delete expense / delete trip dialogs — standardized (`dialogPaperSx`)
- [x] Workout log / edit / duplicate — `components/health/workout-form.tsx`,
      routes `health/exercise/new` (`?from=<id>` = duplicate) and
      `health/exercise/[id]/edit`
- [x] Workout routines (presets) — list page `health/exercise/routines`,
      `RoutineForm` at `routines/new` + `routines/[id]/edit` (replaced the
      two-view PresetFormDrawer)

## To do — Health (priority)

- [ ] **Exercise library** — `health/exercises/page.tsx` `ExerciseFormDrawer`
      (New / Edit Exercise: name, bodyweight, muscle groups). Has its own copy
      of `MuscleGroupCard`; switch it to
      `components/health/muscle-group-grid.tsx`. → `health/exercises/new`,
      `health/exercises/[id]/edit`
- [ ] **Weight** — `health/weight/page.tsx` inline FormDrawer (Log / Edit
      Weight: date, lbs). Smallest one; a good template for the rest. →
      `health/weight/new`, `health/weight/[id]/edit`
- [ ] **Supplements** — `health/supplements/page.tsx` `SupplementDrawer`
      (tabbed: Log supplements for a date / Manage supplements with inline
      New/Edit Supplement) and `SupplementPresetDrawer` (list + New/Edit Group).
      Split the same way as workouts: log page-form, manage list page, group
      list + form pages.
- [ ] **Diet** — `health/diet/page.tsx` `DietDrawer` (Log Meal / Edit Day, 3400
      lines with food picker + meal groups) and `DietPresetDrawer` (list +
      New/Edit Meal). Biggest migration; do after supplements so the list+form
      split pattern is settled.
- [ ] **Symptoms** — `health/symptoms/page.tsx` `SymptomDrawer` (tabbed Log
      symptoms / Manage symptoms with inline New/Edit Symptom) and
      `SymptomDetailsDrawer` (read-only forensic detail → detail page, like
      expense detail).
- [ ] **Workout detail** — `components/health/workout-detail-drawer.tsx` is a
      detail view, not a form, but for parity with expense detail it should
      become `health/exercise/[id]/page.tsx` (edit/duplicate/delete from its
      action bar). Then edit's back target becomes the detail page.

## To do — Trips

- [ ] **Settlements** — `trips/[slug]/debts/page.tsx` has two MUI Dialogs
      (record settlement: from/to/amount/date/note; delete confirm). The record
      form → `debts/settle/new` (prefill via `?from=&to=&amount=`).
- [ ] **Trip participants / roles** — handled inside the trip form already;
      nothing separate.

## To do — Settings

- [ ] **Categories** — `settings/categories/page.tsx` inline add/edit rows +
      delete Dialog. Inline row editing is fine for a short list; only
      standardize the delete dialog on `dialogPaperSx`/`destructiveButtonSx`.
- [ ] **Locations** — `settings/locations/page.tsx` same shape; its delete
      Dialog is unstyled (plain MUI) — restyle.
- [ ] **Invite** — `settings/invite/page.tsx` inline email add + revoke Dialog
      (unstyled) — restyle the dialog.
- [ ] **Icon customize** — `settings/page.tsx` `IconCustomizeDialog` (initials +
      color) → could become `settings/icon` page or stay a dialog; small, low
      priority.

## Follow-ups noticed during the workout migration

- [ ] `components/form-drawer.tsx` becomes dead once the health drawers are gone
      — delete it and the `zIndex: 1600` note in `selectMenuProps`.
- [ ] `FormDateField` week strip: consider a `min`/`max` (trip form end date
      uses `min` on its text field today).
- [ ] Gallery navigation: the forms page's chip strip is getting long — a left
      rail / grouped index would scale better (Ivan flagged this).
- [ ] Sticky per-form defaults (last-used currency/split on expenses; last
      routine on workouts) — see trips-todo "Entry friction".
