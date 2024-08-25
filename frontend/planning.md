# Planning

## Databases

### Creating a database

1. Generate an ID.
2. Create a BQ row w/ ID and default database values JSON.
3. BQ row is fetched and passed into Database component.

### Editing a database

1. Once user clicks away from editing cell, update the database values JSON in local state and
   update BQ row.

We only fetch BQ on page load. Use local data while editing, but update BQ rows for every edit.

### What does the Database component need?

-   JSON database data, or whatever format we parse the JSON into.
-   Database UI.

```
{
    id: uuid,
    columns: [
        { col1Name, col1Type },
        { col2Name, col2Type },
        { col3Name, col3Type },
        ...
    ],
    totalCols: 5,
    rows: [
        {row1val1, row1val2, row1val3, ...},
        {row2val1, row2val2, row2val3, ...},
        {row3val1, row3val2, row3val3, ...},
        ...
    ],
    totalRows: 5,
    style: {
        ...
    },
}
```
