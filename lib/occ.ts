/**
 * Optimistic concurrency (OCC) helpers.
 *
 * Contract: `updated_at` is the version token, compared at MILLISECOND
 * precision. Postgres stores timestamptz with microseconds, but the client
 * can only ever hold milliseconds — every fetch serializes through a JS
 * Date, which truncates. Comparing a raw `updated_at` column against a
 * client-supplied token therefore never matches; all comparisons (SQL and
 * JS alike) must go through these helpers.
 *
 * Leaf module — must not import from app code (see check:cycles).
 */

/**
 * SQL predicate matching an updated_at column against a client token at
 * millisecond precision. `param` is a placeholder like '$3'.
 */
export function occMatchSql(column: string, param: string): string {
    return `date_trunc('milliseconds', ${column}) = date_trunc('milliseconds', ${param}::timestamptz)`
}

/**
 * JS-side token comparison, for routes that fetch the row before updating.
 * Both sides normalize through a JS Date (millisecond precision).
 */
export function occTokensMatch(dbValue: string | Date, clientToken: string): boolean {
    return new Date(dbValue).toISOString() === new Date(clientToken).toISOString()
}
