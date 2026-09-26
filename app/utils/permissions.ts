import type { TripRole } from '@/lib/types'

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

/** Record or undo a payment — mirrors lib/permissions.ts (the API enforces it). */
export function canSettlePayment(role: TripRole | null, isAdmin: boolean, isInvolved: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin' || (isInvolved && canAddExpense(role))
}

export function canManageRoles(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin'
}

export function canManageLocations(role: TripRole | null, isAdmin: boolean): boolean {
    return isAdmin || role === 'owner' || role === 'admin' || role === 'editor'
}
