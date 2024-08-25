# Peanut - Project Planning

## databases

### core functionality

-   databases
    -   create
    -   edit (name)
    -   delete
-   columns
    -   create (empty for all rows)
    -   edit (name, order)
    -   delete (deletes for all rows)
-   rows
    -   create
    -   delete
-   values
    -   edit
-   sort & filter rows by column

### extra functionality

-   database values
    -   functions based on other values
    -   select, multi-select
-   backups
    -   affects
        -   databases
        -   columns
        -   rows
    -   functionality
        -   when deleted, goes to backup
            -   stored as same format as database (database with deleted columns and rows)
        -   from backup, can:
            -   databases
                -   restore all columns and rows (note 1)
            -   columns
                -   restore row values for deleted column
            -   rows
                -   restore row values
        -   can permanently delete from backup
-   shared columns
-   import data (csv, text)

(note 1) for this to be possible, we have to backup values anyways. so we could have backups look
the same as databases, except no editing. can only restore to databases or delete permanently.

---

## check in

### core functionality

-   create a check-in button that adds a row to a database
    -   set prefill values
-   clicking the check-in button
    -   form to ask for non-prefill values

### extra functionality

-   enter multiple rows to a database

---

## goals

### core functionality

-   create recurring goals
    -   auto log & archive from past time frames
    -   auto create for current time frame
    -   scheduling
-   create one-off goals (not time based)
-   goal criteria should be flexible. multiple columns from multiple databases.

### extra functionality

-   notifications
    -   reminders
    -   progress updates
    -   summaries of week, month

---

## visualizations

### core functionality

-   create a visualization from database data
-   customize graph type, labels, scale, colors
-   save visualizations

### extra functionality

-   show data from multiple databases in one graph
-   export as image
-   same backup plan as databases
