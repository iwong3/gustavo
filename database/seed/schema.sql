--
-- create tables
--

--
-- "peanut_databases" table
--
CREATE TABLE "peanut_databases" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL
);

ALTER TABLE "peanut_databases"
    ADD CONSTRAINT "pk_databases"
            PRIMARY KEY (id);

--
-- "peanut_columns" table
--
CREATE TABLE "peanut_columns" (
    "id" INTEGER NOT NULL,
    "database_id" INTEGER NOT NULL,
    "next_id" INTEGER,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL
);

ALTER TABLE "peanut_columns"
    ADD CONSTRAINT "pk_columns"
        PRIMARY KEY (id),
    ADD CONSTRAINT "fk_columns_databases"
        FOREIGN KEY (database_id)
        REFERENCES "peanut_databases" (id);

--
-- "peanut_rows" table
--
CREATE TABLE "peanut_rows" (
    "id" INTEGER NOT NULL,
    "database_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP,
    "active" BOOLEAN NOT NULL
);

ALTER TABLE "peanut_rows"
    ADD CONSTRAINT "pk_rows"
            PRIMARY KEY (id),
    ADD CONSTRAINT "fk_rows_databases"
            FOREIGN KEY (database_id)
            REFERENCES "peanut_databases" (id);

--
-- "peanut_values" table
--
CREATE TYPE "value_type" AS ENUM (
    'BOOLEAN',
    'DATETIME',
    'NUMBER',
    'STRING'
);

CREATE TABLE "peanut_values" (
    "id" INTEGER NOT NULL,
    "database_id" INTEGER NOT NULL,
    "column_id" INTEGER NOT NULL,
    "row_id" INTEGER NOT NULL,
    "value_type" value_type NOT NULL,
    "string_value" TEXT,
    "numeric_value" NUMERIC,
    "datetime_value" TIMESTAMP,
    "boolean_value" BOOLEAN
);

ALTER TABLE "peanut_values"
    ADD CONSTRAINT "pk_values"
            PRIMARY KEY (id),
    ADD CONSTRAINT "fk_values_databases"
            FOREIGN KEY (database_id)
            REFERENCES "peanut_databases" (id),
    ADD CONSTRAINT "fk_values_columns"
            FOREIGN KEY (column_id)
            REFERENCES "peanut_columns" (id),
    ADD CONSTRAINT "fk_values_rows"
            FOREIGN KEY (row_id)
            REFERENCES "peanut_rows" (id);
