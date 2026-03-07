import type { TripRole } from '@/lib/types'

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
