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
- [ ] Update "manage categories" and "manage locations" settings
- [ ] Add ability to add locations when creating or editing a trip

## UX / Design

- [ ] Loading screens
- [ ] Error screens
- [ ] Sort/filter trips
- [ ] Explore hold and drag for trips, expenses
- [ ] Instead of expanding expense, click to show popup modal with more details
- [ ] Settings to change theme
- [ ] Setting to use your Google avatar instead of initials icon
- [ ] Setting to pick initials icon background color
- [ ] Update version git commit hash to include datetime of deployment

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
