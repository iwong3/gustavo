# To-Do List

## High Priority

- [ ] Once prod is working, merge to main and get rid of GH pages
- [ ] Double check payment safeguards for Vercel, Neon, GCP OAuth
- [ ] Improve the process of getting the updated PWA app on phone

## Features

- [ ] Audit log
- [ ] Create/edit/delete a trip
- [ ] Edit/delete expenses
    - [ ] Add/edit/delete categories, locations, etc.
- [ ] Currency conversion API

## UX / Design

- [ ] Transition off of MUI/Emotion and into Tailwind
- [ ] Come up with a high level theme consistent across whole app
- [ ] Re-design homepage
    - [ ] Welcome screen
        - [ ] Select app (currently only Travel Expenses)
- [ ] Re-design trip selection
- [ ] Re-design expense tracker
- [ ] Re-design form to enter expenses
    - [ ] View options in logical way? (relevant locations for a country?)
- [ ] Mobile first UX

## Tech Debt

- [ ] Simplify Zustand usage

## Others

- [ ] Update app documentation

## Errors to Fix

### 1.

A tree hydrated but some attributes of the server rendered HTML didn't match the
client properties. This won't be patched up. This can happen if a SSR-ed Client
Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time
  it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes
with the HTML before React loaded.

Ivan: Can we stop using `if (typeof window !== 'undefined')` everywhere?

### 2.

Refreshing on a trips page shows:

Uncaught Error: Element type is invalid: expected a string (for built-in
components) or a class/function (for composite components) but got: undefined.
You likely forgot to export your component from the file it's defined in, or you
might have mixed up default and named imports.

## Done

- [x] `node -v` is v22.14.0 - I thought we switched to 24?
- [x] linter (installed prettier)
- [x] Backfill Google Sheets data for local
- [x] Get current app functionality working with DB
- [x] Backfill prod with Google Sheets data
- [x] Add routing
- [x] Add ability to enter expense
- [x] Always present app menu
