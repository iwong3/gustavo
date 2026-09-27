/**
 * Who's on an expense: resolve the payer, the split and the covered
 * ("treated") participants to user ids — only ever among the trip's own
 * participants.
 *
 * The expense form sends ids (`paid_by_id`, `split_between_ids` /
 * `split_everyone`, `covered_participant_ids`). Older clients (a PWA cached
 * before July 2026's fix) send first names (`paid_by`, `split_between`,
 * `covered_participants`); names are matched against this trip's roster
 * only, and a name two participants share is rejected rather than guessed —
 * guessing is how the old global lookup silently added strangers to splits.
 *
 * Ids are BIGINT strings at runtime: everything here compares String(id).
 */

import type { PoolClient } from 'pg'

export type RosterEntry = {
    id: string
    firstName: string
    /** Still on the trip (left_at IS NULL). "Everyone" means these. */
    active: boolean
}

/** The people fields an expense create/update body may carry. */
export type ExpensePeopleInput = {
    paid_by_id?: string | number
    split_between_ids?: (string | number)[]
    split_everyone?: boolean
    covered_participant_ids?: (string | number)[]
    /** Legacy: first names. */
    paid_by?: string
    split_between?: string[]
    covered_participants?: string[]
}

export type ResolvedPeople = {
    /** Set when the body names a payer. */
    payerId?: string
    /** Set when the body names a split. */
    participantIds?: string[]
    /** Set when the body names a split or covered people. */
    coveredIds?: Set<string>
}

/** A bad request: the route answers 400 with this message. */
export class ExpensePeopleError extends Error {}

/** Everyone who is or was on the trip, with their first names. */
export async function loadTripRoster(client: PoolClient, tripId: number): Promise<RosterEntry[]> {
    const res = await client.query(
        `SELECT tp.user_id, split_part(u.name, ' ', 1) AS first_name, tp.left_at IS NULL AS active
         FROM trip_participants tp
         JOIN users u ON u.id = tp.user_id
         WHERE tp.trip_id = $1`,
        [tripId]
    )
    return res.rows.map((r) => ({
        id: String(r.user_id),
        firstName: String(r.first_name),
        active: Boolean(r.active),
    }))
}

/**
 * Resolve an expense body's people against the trip roster. Pure — the
 * routes load the roster and pass it in. Throws ExpensePeopleError for
 * anything a client shouldn't send (unknown ids, ambiguous names, an
 * empty split).
 */
export function resolveExpensePeople(roster: RosterEntry[], body: ExpensePeopleInput): ResolvedPeople {
    const byId = new Map(roster.map((r) => [r.id, r]))

    const checkId = (raw: string | number, what: string): string => {
        const id = String(raw)
        if (!byId.has(id)) throw new ExpensePeopleError(`${what} isn't on this trip`)
        return id
    }
    const byName = (name: string, what: string): string => {
        const matches = roster.filter((r) => r.firstName === name)
        if (matches.length === 0) throw new ExpensePeopleError(`${what} "${name}" isn't on this trip`)
        if (matches.length > 1) {
            throw new ExpensePeopleError(
                `Two people on this trip are named ${name} — update the app and try again`
            )
        }
        return matches[0].id
    }

    const out: ResolvedPeople = {}

    // Payer
    if (body.paid_by_id !== undefined) out.payerId = checkId(body.paid_by_id, 'The payer')
    else if (body.paid_by !== undefined) out.payerId = byName(body.paid_by, 'The payer')

    // Split
    const legacyEveryone = body.split_between?.length === 1 && body.split_between[0] === 'Everyone'
    if (body.split_everyone || (body.split_between_ids === undefined && legacyEveryone)) {
        out.participantIds = roster.filter((r) => r.active).map((r) => r.id)
    } else if (body.split_between_ids !== undefined) {
        out.participantIds = Array.from(new Set(body.split_between_ids.map((id) => checkId(id, 'Someone in the split'))))
    } else if (body.split_between !== undefined) {
        out.participantIds = Array.from(new Set(body.split_between.map((n) => byName(n, 'Someone in the split'))))
    }
    if (out.participantIds && out.participantIds.length === 0) {
        throw new ExpensePeopleError('An expense needs at least one person in the split')
    }

    // Covered — resolved whenever the split or the covered list is sent
    // (an edit that re-sends the split with nobody covered clears them)
    if (body.covered_participant_ids !== undefined) {
        out.coveredIds = new Set(body.covered_participant_ids.map((id) => checkId(id, 'Someone treated')))
    } else if (body.covered_participants !== undefined) {
        out.coveredIds = new Set(body.covered_participants.map((n) => byName(n, 'Someone treated')))
    } else if (out.participantIds) {
        out.coveredIds = new Set()
    }

    return out
}

/**
 * Covered people must be in the split and can't be the payer (the payer is
 * who absorbs their share). Anything else is dropped rather than stored.
 */
export function effectiveCovered(covered: Set<string>, participantIds: string[], payerId: string): Set<string> {
    const inSplit = new Set(participantIds)
    return new Set(Array.from(covered).filter((id) => inSplit.has(id) && id !== payerId))
}
