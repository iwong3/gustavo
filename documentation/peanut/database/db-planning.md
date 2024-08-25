# Peanut - Database Planning

## Considerations

-   Partioning
    -   Values table could get big over time, but it is only personal data. Unlikely for queries to
        take too long.
-   Batching
    -   Constant edits could use up a lot of DB calls.
-   Database owner, permissions, passwords
-   Split up schema / migrations into separate SQL files.
    -   Easier to edit & manage.
    -   Easier to take out pieces.

## Schema

### Table: Databases

| Column Name | Column Type |
| :---------- | :---------- |
| ID          | serial      |
| Name        | varchar     |
| Active      | boolean     |

---

### Table: Columns

| Column Name | Column Type     |
| :---------- | :-------------- |
| ID          | serial          |
| Database ID | integer         |
| Next        | integer         |
| Name        | varchar         |
| Type        | varchar or enum |
| Active      | boolean         |

Notes:

-   Handle ordering with every column pointing to next column.
    -   Updates are handled like a linked list.

---

### Table: Rows

| Column Name | Column Type |
| :---------- | :---------- |
| ID          | serial      |
| Database ID | integer     |
| CreatedAt   | timestamp   |
| Active      | boolean     |

Notes:

-   CreatedAt will give us the default row ordering.
    -   Any custom ordering or filtering will happen client-side.

---

### Table: Values

| Column Name    | Column Type |
| :------------- | :---------- |
| ID             | serial      |
| Database ID    | integer     |
| Column ID      | integer     |
| Row ID         | integer     |
| Value Type     | varchar     |
| String Value   | varchar     |
| Number Value   | integer     |
| DateTime Value | timestamp   |
| Boolean Value  | boolean     |

Notes:

-   could have a column for every value type. better than table for every value type because making
    more queries would be bad.

---

## Queries

Database: Exercise

| ID  | Date     | Duration | Type    |
| :-- | :------- | :------- | :------ |
| 1   | 1/1/2022 | 30       | Biking  |
| 2   | 1/2/2022 | 60       | Lifting |
| 3   | 1/3/2022 | 20       | Biking  |

### Get Database

Select all values with correct Database ID and Column IDs that are active and Row IDs that are
active.

```
SELECT * FROM Values WHERE "Database ID" = <db_id>;
```

---

## Infra

GCP doesn't have a free SQL db, but you can spin up MySQL / PostgreSQL on Compute Engine EC2.

-   https://cloud.google.com/architecture/setup-mysql
-   https://cloud.google.com/community/tutorials/setting-up-postgres

Pros

-   Can spin DB up locally as well.
    -   Could regularly save DB snapshots to S3 (or Cloud Storage?). Set up a script on computer to
        grab and sync local DB with cloud DB.
    -   Can start coding and testing more easily.

## CI/CD

Create scripts or CLI commands that run `psql` commands.

1. Drop database if exists
2. Create database
3. Create database properties, users, permissions
4. Apply schema
5. Apply migrations

Questions

-   How do we persist data?
    -   Seed data state for local.
    -   Prod probably doesn't re-create databases.
    -   Can we sync prod data with local? Maybe as part of resetting local?
