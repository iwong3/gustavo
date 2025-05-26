# App Suite

A multi-feature application suite

## Features

### Gustavo - Spending Tracker (`/gustavo`)

Track spending and split costs

## Architecture

This app is designed as a multi-feature suite:

-   **Root (`/`)**: Landing page with feature selection
-   **Gustavo (`/gustavo`)**: Spending tracker feature
-   **Future features**: Will be added at their own paths (e.g., `/feature2`,
    `/feature3`)

## Deployment

### Vercel (Current)

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect this as a React app
3. Deploy!

The app is configured to run from the root path and `vercel.json` handles
client-side routing.

### GitHub Pages (Legacy)

To re-enable GitHub Pages deployment, add this to `package.json`:

```json
"homepage": "https://iwong3.github.io/gustavo/"
```

Then run:

```bash
npm run deploy
```

## Gustavo Feature To-Do:

Graphs

-   Line graph by person
    -   Clicking shows each person's spend on date
    -   Click to see bar totals vs. person lines
    -   Filter which person's line to show
-   Fix filter brightness not working on ios

UX

-   Dark mode

To-Do

-   Separate Google Sheet for tracking To-Do items

### Done

Receipts

-   Search bar
-   Scroll to top

Totals

-   Total spent
-   Compare person / spend type to total spent
    -   Compare to absolute total? Or total of current filters?

Graphs

-   Horizontally scrollable

UX

-   Collapse all receipts
-   Reset debt calculator
-   Show active filters
-   Protect against $NaN values as Google Sheets currency conversion sometimes
    fails
-   Log errors and add view to see which rows were affected
-   Link to View Only Google Sheet
-   Clicking on trip name should bring user back to trip menu
