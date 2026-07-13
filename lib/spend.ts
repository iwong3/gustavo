// Per-person spend attribution. Leaf file — must not import from component
// files (circular-import rule).

import type { Expense } from './types'

/**
 * How much of one expense a user is really responsible for, matching the
 * netSpendByPerson semantics in spend-data-provider: the expense splits
 * evenly across its participants, except covered ("treat") participants,
 * whose shares are absorbed by the payer.
 *
 * `usdValue` is passed in (rather than derived here) so callers can use the
 * blended-exchange-rate value from useSpendData().getUsdValue.
 */
export function expenseShareForUser(
    exp: Expense,
    userId: number,
    usdValue: number,
    participantCount: number
): number {
    const splitCount = exp.isEveryone
        ? participantCount
        : exp.splitBetween.length
    if (splitCount === 0) return 0
    const splitCost = usdValue / splitCount

    const coveredIds = new Set(exp.coveredParticipants.map((p) => p.id))

    let share = 0
    for (const participant of exp.splitBetween) {
        const responsibleId = coveredIds.has(participant.id)
            ? exp.paidBy.id
            : participant.id
        if (responsibleId === userId) share += splitCost
    }
    return share
}
