import { ConflictError } from 'utils/api'

/**
 * User-facing message for a failed delete — shown in a toast (swipe
 * deletes) or inline in a delete dialog. `thing` names the record
 * ("expense", "trip", "workout").
 */
export function deleteErrorMessage(err: unknown, thing: string): string {
    if (err instanceof ConflictError) {
        return `Someone else changed this ${thing}. Pull down to refresh, then try again.`
    }
    // fetch() rejects with a TypeError when the request never got a response
    if (err instanceof TypeError) {
        return `Couldn't delete — check your connection and try again.`
    }
    return `Couldn't delete this ${thing}. Try again.`
}
