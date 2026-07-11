# Trips To-Do List

## High Priority

- [ ] Once prod is working, merge to main and get rid of GH pages
- [ ] Double check payment safeguards for Vercel, Neon, GCP OAuth
- [ ] Improve the process of getting the updated PWA app on phone

## Features

- [ ] Export trip data as CSV
- [ ] More useful graphs for trip expense data
- [ ] Add notes for a trip? Such as link to Google Photos album
- [ ] Track user's last login
- [ ] End of trip report generator? Standalone page or image or pdf gen. Include
      fun stats.
- [ ] Copy expense (useful for similar expenses)

## UX / Design

- [ ] Loading screens
- [ ] Error screens
- [ ] Sort/filter trips
- [ ] Explore hold and drag for trips, expenses
- [ ] Instead of expanding expense, click to show popup modal with more details
- [ ] Settings to change theme
- [ ] Update version git commit hash to include datetime of deployment
- [ ] Update debt UX
- [ ] Update expense row UX
- [ ] Ask for location and filter place search results by closest to you
- [ ] New expenses
    - [ ] Instead of dividers, maybe colors or backgrounds to divide sections?
    - [ ] Re-think the cost/boba section
    - [ ] Fix small spacing issues with split between section. Also, should
          single person paying omit?
    - [ ] Do we need the website? Maybe there's a better spot to put it?
    - [ ] Reconsider "also on today" section
    - [ ] Swipe to go left/right
    - [ ] Shrink width a little to show cards on left/right?
    - [ ] Expense X of X text centered looks a lil awkward
    - [ ] Make graph show covered costs better?
    - [ ] What does $0 total this trip mean for the "Paid by X" section? is this
          how much that person covered you? if so, make it clearer

---

- Disable submit while pending (you already mentioned). Use the button's loading
  state — show a spinner inline so the user knows something's happening.
- Optimistic UI for low-risk actions — toggling a checkbox, reordering, marking
  done. The action feels instant; rollback on error is rare and acceptable.
- Toast for every mutation result — success and error. Silent success is
  disorienting ("did it save?"). Errors must never be silent.
- Idempotency keys on create endpoints — generate a UUID client-side, send it
  with the POST, server dedupes. Protects against double-submits from network
  retries, not just double-clicks.
- Confirm destructive actions — you already do this for delete. The bar:
  anything that loses data the user can't easily recreate.
- Undo over confirm where possible — for soft-delete actions, a "Deleted. Undo"
  toast for 5s feels much better than a confirm dialog. You have soft deletes
  already, so this is essentially free.
- Skeleton loaders, not spinners, for first loads. They feel faster because the
  layout doesn't jump.
- No layout shift when data arrives — reserve space for content that's loading.
- Debounce search/filter inputs — 200–300ms is the sweet spot.
- Form state preserved across navigation — if a user starts typing an expense,
  navigates away, and comes back, the draft should still be there. Bigger lift,
  lower priority.
- Disable the entire form during submission, not just the button — prevents
  editing fields mid-save.
- Show "saved" indicators for autosave flows. Not relevant if everything is
  explicit save.
- Focus management — after closing a dialog, return focus to the trigger. Helps
  keyboard + screen reader users; also just feels right.
- Optimistic navigation — when you submit a form that creates a thing and
  redirects, navigate immediately and let the new page's query do the loading.
  Don't wait for the POST response and then navigate.

## Tech Debt

- [ ] Simplify Zustand usage
- [ ] Consider MUI/Emotion vs. Tailwind
- [ ] Unit tests (e.g. debt calculation logic)

## Others

- [ ] Update app documentation

## Done

- [x] `node -v` is v22.14.0 - I thought we switched to 24?
- [x] linter (installed prettier)
- [x] Backfill Google Sheets data for local
- [x] Get current app functionality working with DB
- [x] Backfill prod with Google Sheets data
- [x] Add routing
- [x] Add ability to enter expense
- [x] Always present app menu
- [x] Audit log
- [x] Create/edit/delete a trip
- [x] Edit/delete expenses
    - [x] Add/edit/delete categories, locations, etc.
- [x] Come up with a high level theme consistent across whole app
- [x] Re-design homepage
    - [x] Welcome screen
        - [x] Select app (currently only Travel Expenses)
- [x] Re-design trip selection
- [x] Re-design expense tracker
- [x] Roles/access
    - [x] Private by default
    - [x] Add people as editors/viewers
- [x] View other people's trips
- [x] Track currency exchange as expenses for more accurate debt calculation
- [x] Re-design form to enter expenses
    - [x] Drawer from bottom up
    - [x] Make form easier to fill in with pre-fills, fewer clicks
- [x] Setting to change initials and icon color
- [x] Add ability to add locations when creating or editing a trip
- [x] Add a side drawer menu to navigate to any page with 1 click
- [x] Redesign nav - Trips > Expenses / Debts / Graphs
- [x] Activity log
- [x] Update "manage categories" and "manage locations" settings
- [x] When adding expense, add ability to "cover" for user(s)
- [x] Google Places!
    - [x] Google Places search with autocomplete
    - [x] Pre-fill name, location, category from autocomplete
    - [x] Google Places name, address, and map view with link to Google Maps
