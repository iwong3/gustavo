/**
 * Debt simplification and settlement computation.
 *
 * The raw debtMap (from SpendDataProvider) tracks: userId → userId → gross amount owed.
 * This module:
 *   1. Nets pairwise debts (A owes B $20, B owes A $8 → A owes B $12)
 *   2. Simplifies to minimum transactions (greedy algorithm on net balances)
 *   3. Provides per-person breakdowns for the detail drawer
 */

import type { Expense, UserSummary } from './types'

// --- Types ---

/** A single simplified settlement: debtor pays creditor this amount. */
export type Settlement = {
    debtorId: number
    creditorId: number
    amount: number // always positive, in USD
}

/** Pairwise debt between two people (netted). */
export type PairwiseDebt = {
    fromId: number // owes
    toId: number   // is owed
    grossFromTo: number // total A paid for B's share
    grossToFrom: number // total B paid for A's share
    netAmount: number   // always positive, direction indicated by fromId/toId
}

/** Per-person balance summary. */
export type PersonBalance = {
    userId: number
    netBalance: number // positive = is owed money, negative = owes money
    totalPaid: number  // total this person paid for others
    totalOwed: number  // total this person owes others
}

/** Expense grouped by currency type for the detail drawer. */
export type GroupedExpenses = {
    usdExpenses: Expense[]
    foreignExpenses: Expense[]
    currencyExchangeExpenses: Expense[]
}

// --- Net pairwise debts ---

/**
 * Net the raw debtMap into pairwise debts.
 * Raw debtMap: debtorId → creditorId → gross amount debtor owes creditor.
 * Returns netted pairs where netAmount > 0.
 */
export function netPairwiseDebts(
    debtMap: Map<number, Map<number, number>>
): PairwiseDebt[] {
    // Collect all unique pairs and their gross debts in both directions
    const pairKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`
    const pairs = new Map<string, { a: number; b: number; aOwesB: number; bOwesA: number }>()

    debtMap.forEach((creditors, debtorId) => {
        creditors.forEach((amount, creditorId) => {
            const key = pairKey(debtorId, creditorId)
            const pair = pairs.get(key) ?? {
                a: Math.min(debtorId, creditorId),
                b: Math.max(debtorId, creditorId),
                aOwesB: 0,
                bOwesA: 0,
            }
            if (debtorId === pair.a) {
                pair.aOwesB += amount
            } else {
                pair.bOwesA += amount
            }
            pairs.set(key, pair)
        })
    })

    const result: PairwiseDebt[] = []
    pairs.forEach((pair) => {
        const net = pair.aOwesB - pair.bOwesA
        if (Math.abs(net) < 0.005) return // effectively zero

        result.push({
            fromId: net > 0 ? pair.a : pair.b,
            toId: net > 0 ? pair.b : pair.a,
            grossFromTo: net > 0 ? pair.aOwesB : pair.bOwesA,
            grossToFrom: net > 0 ? pair.bOwesA : pair.aOwesB,
            netAmount: Math.abs(net),
        })
    })

    return result
}

// --- Debt simplification (minimum transactions) ---

/**
 * Compute net balance per person from the raw debtMap.
 * Positive = person is owed money (creditor). Negative = person owes money (debtor).
 */
export function computeNetBalances(
    debtMap: Map<number, Map<number, number>>,
    participants: UserSummary[]
): PersonBalance[] {
    // Track totals for each person
    const totalPaid = new Map<number, number>() // what others owe this person
    const totalOwed = new Map<number, number>() // what this person owes others

    debtMap.forEach((creditors, debtorId) => {
        creditors.forEach((amount, creditorId) => {
            totalOwed.set(debtorId, (totalOwed.get(debtorId) ?? 0) + amount)
            totalPaid.set(creditorId, (totalPaid.get(creditorId) ?? 0) + amount)
        })
    })

    return participants.map((p) => {
        const paid = totalPaid.get(p.id) ?? 0
        const owed = totalOwed.get(p.id) ?? 0
        return {
            userId: p.id,
            netBalance: paid - owed, // positive = is owed, negative = owes
            totalPaid: paid,
            totalOwed: owed,
        }
    })
}

/**
 * Simplify debts to minimum number of transactions.
 * Uses a greedy algorithm: repeatedly match the largest debtor with the largest creditor.
 */
export function simplifyDebts(
    debtMap: Map<number, Map<number, number>>,
    participants: UserSummary[]
): Settlement[] {
    const balances = computeNetBalances(debtMap, participants)

    // Separate into debtors (negative balance) and creditors (positive balance)
    const debtors: { userId: number; amount: number }[] = []
    const creditors: { userId: number; amount: number }[] = []

    for (const b of balances) {
        if (b.netBalance < -0.005) {
            debtors.push({ userId: b.userId, amount: -b.netBalance }) // make positive
        } else if (b.netBalance > 0.005) {
            creditors.push({ userId: b.userId, amount: b.netBalance })
        }
    }

    // Sort both descending by amount
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    const settlements: Settlement[] = []
    let di = 0
    let ci = 0

    while (di < debtors.length && ci < creditors.length) {
        const debtor = debtors[di]
        const creditor = creditors[ci]
        const amount = Math.min(debtor.amount, creditor.amount)

        if (amount > 0.005) {
            settlements.push({
                debtorId: debtor.userId,
                creditorId: creditor.userId,
                amount: Math.round(amount * 100) / 100,
            })
        }

        debtor.amount -= amount
        creditor.amount -= amount

        if (debtor.amount < 0.005) di++
        if (creditor.amount < 0.005) ci++
    }

    return settlements
}

// --- Sort settlements by current user ---

/**
 * Sort settlements with the current user's settlements first,
 * then alphabetized as specified.
 */
export function sortSettlements(
    settlements: Settlement[],
    currentUserId: number,
    participantById: Map<number, UserSummary>
): Settlement[] {
    const getName = (id: number) => participantById.get(id)?.firstName ?? ''

    // Group: user owes, user is owed, others
    const userOwes: Settlement[] = []
    const userIsOwed: Settlement[] = []
    const others: Settlement[] = []

    for (const s of settlements) {
        if (s.debtorId === currentUserId) {
            userOwes.push(s)
        } else if (s.creditorId === currentUserId) {
            userIsOwed.push(s)
        } else {
            others.push(s)
        }
    }

    // Sort user-owes by creditor name (debtee)
    userOwes.sort((a, b) => getName(a.creditorId).localeCompare(getName(b.creditorId)))
    // Sort user-is-owed by debtor name
    userIsOwed.sort((a, b) => getName(a.debtorId).localeCompare(getName(b.debtorId)))
    // Sort others by creditor name first, then debtor name
    others.sort((a, b) => {
        const credCmp = getName(a.creditorId).localeCompare(getName(b.creditorId))
        if (credCmp !== 0) return credCmp
        return getName(a.debtorId).localeCompare(getName(b.debtorId))
    })

    return [...userOwes, ...userIsOwed, ...others]
}

// --- Filter expenses between two people ---

/**
 * Get expenses that contribute to the debt between two people,
 * grouped by currency type.
 */
export function getExpensesBetween(
    expenses: Expense[],
    personAId: number,
    personBId: number
): GroupedExpenses {
    const relevant = expenses.filter((exp) => {
        if (exp.paidBy.id === personAId) {
            return exp.isEveryone || exp.splitBetween.some((u) => u.id === personBId)
        }
        if (exp.paidBy.id === personBId) {
            return exp.isEveryone || exp.splitBetween.some((u) => u.id === personAId)
        }
        return false
    })

    const usdExpenses: Expense[] = []
    const foreignExpenses: Expense[] = []
    const currencyExchangeExpenses: Expense[] = []

    for (const exp of relevant) {
        if (exp.categorySlug === 'currency_exchange') {
            currencyExchangeExpenses.push(exp)
        } else if (exp.currency === 'USD') {
            usdExpenses.push(exp)
        } else {
            foreignExpenses.push(exp)
        }
    }

    return { usdExpenses, foreignExpenses, currencyExchangeExpenses }
}

// --- Per-person pairwise breakdown ---

export type PersonPairwiseDebt = {
    otherUserId: number
    netAmount: number     // positive = this person owes otherUser
    expenses: GroupedExpenses
}

/**
 * For a given person, get their pairwise debts with every other participant.
 * Returns only pairs with non-zero net debt.
 */
export function getPersonPairwiseDebts(
    userId: number,
    debtMap: Map<number, Map<number, number>>,
    expenses: Expense[],
    participants: UserSummary[]
): PersonPairwiseDebt[] {
    const results: PersonPairwiseDebt[] = []

    for (const other of participants) {
        if (other.id === userId) continue

        const iOwe = debtMap.get(userId)?.get(other.id) ?? 0
        const theyOwe = debtMap.get(other.id)?.get(userId) ?? 0
        const net = iOwe - theyOwe // positive = I owe them

        if (Math.abs(net) < 0.005) continue

        results.push({
            otherUserId: other.id,
            netAmount: net,
            expenses: getExpensesBetween(expenses, userId, other.id),
        })
    }

    // Sort by absolute amount descending
    results.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))

    return results
}
