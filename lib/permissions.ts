import pool from '@/lib/db'

export type TripRole = 'owner' | 'editor' | 'viewer'

export function canEditTrip(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'editor'
}

export function canDeleteTrip(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner'
}

export function canAddExpense(role: TripRole | null): boolean {
    return role === 'owner' || role === 'editor' || role === 'viewer'
}

export function canEditExpense(role: TripRole | null, isAdmin: boolean, isReporter: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'editor' || isReporter
}

export function canDeleteExpense(role: TripRole | null, isAdmin: boolean, isReporter: boolean): boolean {
    return canEditExpense(role, isAdmin, isReporter)
}

export function canManageRoles(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner'
}

export function canManageLocations(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'editor'
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
