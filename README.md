# gustavo

track spending and split costs

## Deployment

### GitHub Pages (Current)

```bash
npm run deploy
```

### Vercel

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect this as a React app
3. Use the default build settings (build command: `npm run build`, output
   directory: `build`)
4. Deploy!

The `vercel.json` configuration file is already set up to handle client-side
routing.

To-Do:

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
