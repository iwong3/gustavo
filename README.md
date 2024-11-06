# gustavo

track spending and split costs

To-Do:

Data

-   Look into memoizing spend data
    -   Using useEffect() seems to be causing issues when changing trips

Trips

-   Update location filter by trips
-   Update graphs by trips
-   Update settings by trips
-   Make the current trip clear
-   Keep Gustavo visible on all pages
-   Cache current trip

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
