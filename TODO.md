# To-Do List

## High Priority

- [ ] Once prod is working, merge to main and get rid of GH pages
- [ ] Double check payment safeguards for Vercel, Neon, GCP OAuth
- [ ] Improve the process of getting the updated PWA app on phone

## Features

- [ ] Currency conversion API
- [ ] Roles/access
    - [ ] Private by default
    - [ ] Add people as editors/viewers
    - [ ] Possibly create groups and add group as editors/viewers? Need to
          figure out interactions with groups and specific people's permissions
- [ ] My trips (upcoming/past) vs. Trips I'm a part of (should that even be a
      difference) vs. other people's public trips
- [ ] Export trip data as CSV
- [ ] More useful graphs for trip expense data
- [ ] Add notes for a trip? Such as link to Google Photos album
- [ ] Track user's last login

## UX / Design

- [ ] Re-design form to enter expenses
    - [ ] View options in logical way? (relevant locations for a country?)
    - [ ] Paper/ledger design animates from bottom up? Covers all of app besides
          header?
- [ ] Re-design form to enter new trip
- [ ] Loading screens
- [ ] Error screens
- [ ] Sort/filter trips
- [ ] Explore hold and drag for trips, expenses
- [ ] Instead of expanding expense, click to show popup modal with more details
- [ ] Settings to change theme
- [ ] Setting to use your Google avatar instead of initials icon

## Tech Debt

- [ ] Simplify Zustand usage
- [ ] Consider MUI/Emotion vs. Tailwind

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
