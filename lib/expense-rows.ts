import pool from '@/lib/db'

// Server-side loader for a trip's expenses in the exact shape the client
// caches (lib/types.ts Expense). Shared by the list GET and by POST/PUT, which
// return the saved expense so the client can drop it straight into its cached
// list — no stale list popping in after a save.

function userSummary(row: { id: number; name: string; email: string | null; avatar_url: string | null; initials: string | null; icon_color: string | null; venmo_url: string | null }) {
    return {
        id: row.id,
        name: row.name,
        firstName: row.name.split(' ')[0],
        email: row.email,
        avatarUrl: row.avatar_url,
        initials: row.initials,
        iconColor: row.icon_color,
        venmoUrl: row.venmo_url,
    }
}

/** A trip's live expenses (date, then created order), or only `onlyIds`. */
export async function loadTripExpenses(tripId: number, onlyIds?: number[]) {
    // Independent queries in parallel: the expenses and the trip's head count
    const [expensesRes, tpCountRes] = await Promise.all([
        // Expenses with payer + reporter + category + location
        pool.query(
            `SELECT
                e.id, e.name, e.date, e.cost_original, e.currency, e.updated_at,
                e.cost_converted_usd, e.exchange_rate, e.conversion_error,
                e.category_id, ec.name AS category_name, ec.slug AS category_slug,
                e.local_currency_received,
                e.location_id, l.name AS location_name,
                e.google_place_id,
                pd.name AS place_name, pd.address AS place_address,
                pd.lat AS place_lat, pd.lng AS place_lng,
                pd.price_level AS place_price_level, pd.price_range AS place_price_range,
                pd.rating AS place_rating, pd.user_rating_count AS place_user_rating_count,
                pd.primary_type AS place_primary_type, pd.types AS place_types,
                pd.website AS place_website, pd.hours_json AS place_hours_json,
                pd.photo_refs AS place_photo_refs,
                pd.address_components AS place_address_components,
                e.notes, e.reported_at,
                payer.id AS payer_id, payer.name AS payer_name, payer.email AS payer_email,
                payer.avatar_url AS payer_avatar_url, payer.initials AS payer_initials,
                payer.icon_color AS payer_icon_color, payer.venmo_url AS payer_venmo_url,
                reporter.id AS reporter_id, reporter.name AS reporter_name,
                reporter.email AS reporter_email, reporter.avatar_url AS reporter_avatar_url,
                reporter.initials AS reporter_initials, reporter.icon_color AS reporter_icon_color,
                reporter.venmo_url AS reporter_venmo_url
            FROM expenses e
            JOIN users payer ON e.paid_by = payer.id
            LEFT JOIN users reporter ON e.reported_by = reporter.id
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            LEFT JOIN locations l ON e.location_id = l.id
            LEFT JOIN place_details pd ON e.google_place_id = pd.google_place_id
            WHERE e.trip_id = $1 AND e.deleted_at IS NULL
              AND ($2::bigint[] IS NULL OR e.id = ANY($2))
            ORDER BY e.date, e.created_at`,
            [tripId, onlyIds ?? null]
        ),
        // Trip participant count for "everyone" detection
        pool.query(
            'SELECT COUNT(*)::int AS count FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL',
            [tripId]
        ),
    ])

    if (expensesRes.rows.length === 0) return []

    const expenseIds = expensesRes.rows.map((e) => e.id)

    // Fetch all expense participants in one query (including covered_by)
    const epRes = await pool.query(
        `SELECT ep.expense_id, ep.covered_by, u.id, u.name, u.email, u.avatar_url, u.initials, u.icon_color, u.venmo_url
         FROM expense_participants ep
         JOIN users u ON ep.user_id = u.id
         WHERE ep.expense_id = ANY($1)
         ORDER BY u.name`,
        [expenseIds]
    )

    // Group participants by expense
    const participantsByExpense = new Map<number, typeof epRes.rows>()
    for (const p of epRes.rows) {
        const list = participantsByExpense.get(p.expense_id) ?? []
        list.push(p)
        participantsByExpense.set(p.expense_id, list)
    }

    const tripParticipantCount: number = tpCountRes.rows[0].count

    return expensesRes.rows.map((e) => {
        const participants = participantsByExpense.get(e.id) ?? []
        const splitBetween = participants.map(userSummary)
        const coveredParticipants = participants
            .filter((p) => p.covered_by != null)
            .map(userSummary)
        return {
            id: e.id,
            updatedAt: new Date(e.updated_at).toISOString(),
            name: e.name,
            date: typeof e.date === 'string' ? e.date.slice(0, 10) : new Date(e.date).toISOString().slice(0, 10),
            costOriginal: parseFloat(e.cost_original),
            currency: e.currency,
            costConvertedUsd: parseFloat(e.cost_converted_usd),
            exchangeRate: e.exchange_rate ? parseFloat(e.exchange_rate) : null,
            conversionError: e.conversion_error,
            categoryId: e.category_id,
            categoryName: e.category_name,
            categorySlug: e.category_slug,
            locationId: e.location_id,
            locationName: e.location_name,
            notes: e.notes ?? '',
            reportedAt: e.reported_at,
            paidBy: userSummary({
                id: e.payer_id, name: e.payer_name, email: e.payer_email,
                avatar_url: e.payer_avatar_url, initials: e.payer_initials,
                icon_color: e.payer_icon_color, venmo_url: e.payer_venmo_url,
            }),
            reportedBy: e.reporter_id ? userSummary({
                id: e.reporter_id, name: e.reporter_name, email: e.reporter_email,
                avatar_url: e.reporter_avatar_url, initials: e.reporter_initials,
                icon_color: e.reporter_icon_color, venmo_url: e.reporter_venmo_url,
            }) : null,
            splitBetween,
            coveredParticipants,
            isEveryone: splitBetween.length === tripParticipantCount,
            localCurrencyReceived: e.local_currency_received ? parseFloat(e.local_currency_received) : null,
            googlePlaceId: e.google_place_id || null,
            place: e.google_place_id ? {
                googlePlaceId: e.google_place_id,
                name: e.place_name,
                address: e.place_address || null,
                lat: e.place_lat != null ? parseFloat(e.place_lat) : null,
                lng: e.place_lng != null ? parseFloat(e.place_lng) : null,
                priceLevel: e.place_price_level != null ? e.place_price_level : null,
                priceRange: e.place_price_range || null,
                rating: e.place_rating != null ? parseFloat(e.place_rating) : null,
                userRatingCount: e.place_user_rating_count != null ? e.place_user_rating_count : null,
                primaryType: e.place_primary_type || null,
                types: e.place_types || null,
                website: e.place_website || null,
                hoursJson: e.place_hours_json || null,
                photoRefs: e.place_photo_refs || null,
                addressComponents: e.place_address_components || null,
            } : null,
            receiptImageUrl: null,
        }
    })
}
