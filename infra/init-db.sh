#!/bin/bash
# Creates the metabase database for Metabase's internal tables.
# Runs once on first Postgres init (docker-entrypoint-initdb.d).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE metabase;
EOSQL
