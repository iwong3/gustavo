import pool from '@/lib/db'

export type TripRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type TripVisibility = 'participants' | 'all_users'

/** Read access to a trip's data: any participant, anyone when the trip is
 *  public (visibility = all_users), or an admin. Mirrors the trip list/slug
 *  visibility rule in app/api/trips/route.ts. */
export function canViewTrip(role: TripRole | null, isAdmin: boolean, visibility: TripVisibility | null): boolean {
    return isAdmin || role !== null || visibility === 'all_users'
}

export function canEditTrip(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin' || role === 'editor'
}

export function canDeleteTrip(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner'
}

export function canAddExpense(role: TripRole | null): boolean {
    return role === 'owner' || role === 'admin' || role === 'editor' || role === 'viewer'
}

export function canEditExpense(role: TripRole | null, isAdmin: boolean, isReporter: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin' || role === 'editor' || isReporter
}

export function canDeleteExpense(role: TripRole | null, isAdmin: boolean, isReporter: boolean): boolean {
    return canEditExpense(role, isAdmin, isReporter)
}

/** Record or undo a payment: only the payer, the receiver (they know whether
 *  the money moved), or trip owners/admins. Mirrored client-side in
 *  app/utils/permissions.ts to hide the Settle / undo controls. */
export function canSettlePayment(role: TripRole | null, isAdmin: boolean, isInvolved: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin' || (isInvolved && canAddExpense(role))
}

export function canManageRoles(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin'
}

export function canManageLocations(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin' || role === 'editor'
}

export function canEditCategory(isAdmin: boolean, isCreator: boolean): boolean {
    return isAdmin || isCreator
}

export function canDeleteCategory(isAdmin: boolean, isCreator: boolean): boolean {
    return isAdmin || isCreator
}

export async function getUserTripRole(
    userId: number,
    tripId: number
): Promise<{ role: TripRole | null; isAdmin: boolean }> {
    const res = await pool.query(
        `SELECT tp.role, u.is_admin
         FROM users u
         LEFT JOIN trip_participants tp ON tp.user_id = u.id AND tp.trip_id = $2 AND tp.left_at IS NULL
         WHERE u.id = $1`,
        [userId, tripId]
    )
    if (res.rows.length === 0) {
        return { role: null, isAdmin: false }
    }
    return {
        role: res.rows[0].role as TripRole | null,
        isAdmin: res.rows[0].is_admin,
    }
}

/** getUserTripRole plus the trip's existence + visibility, for read routes.
 *  `tripExists` is false for a missing or soft-deleted trip (→ 404). */
export async function getTripAccess(
    userId: number,
    tripId: number
): Promise<{ tripExists: boolean; role: TripRole | null; isAdmin: boolean; visibility: TripVisibility | null }> {
    const res = await pool.query(
        `SELECT u.is_admin, t.id AS trip_id, t.visibility, tp.role
         FROM users u
         LEFT JOIN trips t ON t.id = $2 AND t.deleted_at IS NULL
         LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.user_id = u.id AND tp.left_at IS NULL
         WHERE u.id = $1`,
        [userId, tripId]
    )
    const row = res.rows[0]
    if (!row) {
        return { tripExists: false, role: null, isAdmin: false, visibility: null }
    }
    return {
        tripExists: row.trip_id != null,
        role: row.role as TripRole | null,
        isAdmin: row.is_admin,
        visibility: row.visibility as TripVisibility | null,
    }
}
