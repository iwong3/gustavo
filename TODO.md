# To-Do List

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

## Tech Debt

- [ ] Simplify Zustand usage
- [ ] Consider MUI/Emotion vs. Tailwind
- [ ] Unit tests (e.g. debt calculation logic)

## Others

- [ ] Update app documentation

## Non-Trip Related

- [ ] Track exercise
    - [ ] High level categories with optional more detailed sub-categories (e.g.
          Back > Lats)
- [ ] Send Apple Fitness data to app? e.g. running - map path - distance -
      calories - heart rate

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
