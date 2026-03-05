## High Priority

- [ ] Add ability to enter expense
- [ ] Once prod is working, merge to main and get rid of GH pages
- [ ] Double check payment safeguards for Vercel, Neon, GCP OAuth
- [ ] Improve the process of getting the updated PWA app on phone
- [ ] Transition off of MUI/Emotion and into Tailwind

## Medium Priority

- [ ] Update app documentation
- [ ] Re-design homepage
    - [ ] Welcome screen
        - [ ] Select app (currently only Travel Expenses)
- [ ] Re-design trip selection
- [ ] Re-design expense tracker
- [ ] Always present menu?
- [ ] Create a trip
- [ ] Form to enter expenses
    - [ ] Ability to edit options (e.g. location, category)
    - [ ] View options in logical way? (relevant locations for a country?)
- [ ] Mobile first UX

## Ideas

- [ ] Can we get off Zustand now that we have a DB?
- [ ] Are there alternatives to Zustand? I find its state management a bit
      confusing.

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
