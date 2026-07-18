// Spend attribution + debt-map computation. Leaf file — must not import from
// component files (circular-import rule). Shared by the client
// spend-data-provider and the trips-list API route (boarding-pass stats), so
// the two can never disagree on the math.

import { applySettlements, computeNetBalances, simplifyDebts } from './debt'
import type { SettlementRecord, TripStats } from './types'

/** The minimal expense shape the spend math needs. `Expense` satisfies it;
 *  the trips API builds lean objects server-side. Ids are opaque map keys
 *  (BIGINT strings at runtime) — no arithmetic, no `===` across sources. */
export type SpendExpense = {
    currency: string
    costOriginal: number
    costConvertedUsd: number
    categorySlug: string | null
    localCurrencyReceived: number | null
    paidBy: { id: number }
    isEveryone: boolean
    splitBetween: { id: number }[]
    coveredParticipants: { id: number }[]
}

// --- Blended exchange rate calculation ---

export type BlendedRates = {
    /** payerId → currency → rate (local per USD), from that person's own exchanges. */
    byPayer: Map<number, Map<string, number>>
    /** currency → rate pooled across EVERY payer's exchanges — the fallback for
     *  someone who spent local currency without recording an exchange themselves. */
    pooled: Map<string, number>
}

/** Compute blended exchange rates from currency exchange expenses: per payer
 *  (their own money-changing history) plus a trip-wide pool per currency. */
export function computeBlendedRates(expenses: SpendExpense[]): BlendedRates {
    // payerId → currency → { totalUsd, totalLocal }
    const pools = new Map<number, Map<string, { totalUsd: number; totalLocal: number }>>()

    for (const exp of expenses) {
        if (exp.categorySlug !== 'currency_exchange') continue
        if (!exp.localCurrencyReceived || exp.localCurrencyReceived <= 0) continue

        const payerId = exp.paidBy.id
        const currency = exp.currency !== 'USD' ? exp.currency : 'USD'
        // For currency exchange: costOriginal is USD paid, localCurrencyReceived is local currency received
        const usdPaid = exp.costOriginal
        const localReceived = exp.localCurrencyReceived

        const payerPools = pools.get(payerId) ?? new Map()
        const pool = payerPools.get(currency) ?? { totalUsd: 0, totalLocal: 0 }
        pool.totalUsd += usdPaid
        pool.totalLocal += localReceived
        payerPools.set(currency, pool)
        pools.set(payerId, payerPools)
    }

    // Convert pools to rates: rate = totalLocal / totalUsd
    const byPayer = new Map<number, Map<string, number>>()
    const pooledTotals = new Map<string, { totalUsd: number; totalLocal: number }>()
    pools.forEach((currencyPools, payerId) => {
        const payerRates = new Map<string, number>()
        currencyPools.forEach((pool, currency) => {
            if (pool.totalUsd > 0) {
                payerRates.set(currency, pool.totalLocal / pool.totalUsd)
            }
            const agg = pooledTotals.get(currency) ?? { totalUsd: 0, totalLocal: 0 }
            agg.totalUsd += pool.totalUsd
            agg.totalLocal += pool.totalLocal
            pooledTotals.set(currency, agg)
        })
        byPayer.set(payerId, payerRates)
    })

    const pooled = new Map<string, number>()
    pooledTotals.forEach((pool, currency) => {
        if (pool.totalUsd > 0) pooled.set(currency, pool.totalLocal / pool.totalUsd)
    })

    return { byPayer, pooled }
}

/** Get the USD value of an expense, using blended rates for non-USD local
 *  currency expenses: the payer's own rate → the trip-wide pooled rate → the
 *  stored costConvertedUsd → 0. (The pooled step keeps a yen expense from
 *  valuing at $0 just because its payer never exchanged money themselves.) */
export function getExpenseUsdValue(
    exp: SpendExpense,
    blendedRates: BlendedRates
): number {
    // Currency exchange expenses are already in USD (costOriginal = USD paid)
    if (exp.categorySlug === 'currency_exchange') {
        return exp.costOriginal
    }

    // USD expenses — use directly
    if (exp.currency === 'USD') {
        return exp.costOriginal
    }

    // Non-USD expense — the payer's own blended rate first
    const payerRate = blendedRates.byPayer.get(exp.paidBy.id)?.get(exp.currency)
    if (payerRate && payerRate > 0) {
        return exp.costOriginal / payerRate
    }

    // Someone else changed money on this trip — use the pooled rate
    const pooledRate = blendedRates.pooled.get(exp.currency)
    if (pooledRate && pooledRate > 0) {
        return exp.costOriginal / pooledRate
    }

    // Fallback: the stored costConvertedUsd (backfilled legacy rows). Runtime
    // truth: this is null on app-created rows and conversion errors — never
    // return a non-number.
    return Number.isFinite(exp.costConvertedUsd) ? exp.costConvertedUsd : 0
}

// --- Debt calculation ---

export function computeDebtMap(
    expenses: SpendExpense[],
    participantCount: number
): { totalSpend: number; debtMap: Map<number, Map<number, number>> } {
    const blendedRates = computeBlendedRates(expenses)
    let totalSpend = 0
    const debtMap = new Map<number, Map<number, number>>()

    for (const exp of expenses) {
        const usdValue = getExpenseUsdValue(exp, blendedRates)
        totalSpend += usdValue
        const payerId = exp.paidBy.id
        const splitCount = exp.isEveryone ? participantCount : exp.splitBetween.length
        const splitCost = usdValue / splitCount

        // Build set of covered participant IDs for fast lookup
        const coveredIds = new Set(exp.coveredParticipants.map((p) => p.id))

        for (const participant of exp.splitBetween) {
            if (participant.id === payerId) continue
            if (coveredIds.has(participant.id)) continue // covered — no debt
            // participant owes payer
            const owes = debtMap.get(participant.id) ?? new Map()
            owes.set(payerId, (owes.get(payerId) ?? 0) + splitCost)
            debtMap.set(participant.id, owes)
        }
    }

    return { totalSpend, debtMap }
}

// --- Per-person share attribution ---

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
    exp: Pick<SpendExpense, 'isEveryone' | 'splitBetween' | 'coveredParticipants' | 'paidBy'>,
    userId: number,
    usdValue: number,
    participantCount: number
): number {
    const splitCount = exp.isEveryone
        ? participantCount
        : exp.splitBetween.length
    if (splitCount === 0) return 0
    const splitCost = usdValue / splitCount

    // String() both sides — ids are BIGINT strings at runtime and callers may
    // hold the user id from a different source than the expense rows.
    const coveredIds = new Set(exp.coveredParticipants.map((p) => String(p.id)))

    let share = 0
    for (const participant of exp.splitBetween) {
        const responsibleId = coveredIds.has(String(participant.id))
            ? exp.paidBy.id
            : participant.id
        if (String(responsibleId) === String(userId)) share += splitCost
    }
    return share
}

// --- Boarding-pass stats (trips list) ---

export type TripStatsSettlement = Pick<SettlementRecord, 'fromUserId' | 'toUserId' | 'amountUsd'>

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Per-trip aggregates for the trips-list boarding passes. Pure — the API
 * route feeds it lean rows; tests feed it fixtures.
 *
 * Ids may arrive as BIGINT strings; every id comparison here goes through
 * String(). Callers must pass `expenses`, `participantIds`, `settlements`,
 * and `currentUserId` with ids from the same DB source (no pre-mixing of
 * parsed and raw ids).
 */
export function computeTripStats(input: {
    expenses: (SpendExpense & { date: string })[]
    participantIds: number[]
    settlements: TripStatsSettlement[]
    currentUserId: number
    /** YYYY-MM-DD — "today" for the todaySpendUsd bucket. */
    todayIso: string
}): Omit<TripStats, 'latestExpense'> {
    const { participantIds, settlements, currentUserId, todayIso } = input
    const me = String(currentUserId)

    // Divergence from the client: conversion-error rows carry a null/NaN
    // costConvertedUsd (the only non-finite source — costOriginal is NOT NULL).
    // Zero them here so one broken row can't NaN the whole pass, including
    // inside computeDebtMap's own USD derivation.
    const expenses = input.expenses.map((e) =>
        Number.isFinite(e.costConvertedUsd) ? e : { ...e, costConvertedUsd: 0 }
    )

    const blendedRates = computeBlendedRates(expenses)

    let totalSpendUsd = 0
    let todaySpendUsd = 0
    let yourShareUsd = 0
    for (const exp of expenses) {
        const raw = getExpenseUsdValue(exp, blendedRates)
        const usd = Number.isFinite(raw) ? raw : 0
        totalSpendUsd += usd
        if (exp.date === todayIso) todaySpendUsd += usd
        yourShareUsd += expenseShareForUser(exp, currentUserId, usd, participantIds.length)
    }

    const { debtMap } = computeDebtMap(expenses, participantIds.length)
    const settled = applySettlements(debtMap, settlements)
    const idObjs = participantIds.map((id) => ({ id }))

    // MUST match the debts page's "All settled" check (simplifyDebts, its
    // default plan) — recorded settlements can leave sub-cent float residue
    // that a different netting method would surface as a phantom "$0.01".
    const isSettled = simplifyDebts(settled, idObjs).length === 0

    const mine = computeNetBalances(settled, idObjs).find((b) => String(b.userId) === me)
    const rawNet = mine?.netBalance ?? 0
    const yourNetUsd = isSettled || Math.abs(rawNet) < 0.005 ? 0 : round2(rawNet)

    return {
        expenseCount: expenses.length,
        totalSpendUsd: round2(totalSpendUsd),
        todaySpendUsd: round2(todaySpendUsd),
        yourShareUsd: round2(yourShareUsd),
        yourNetUsd,
        isSettled,
    }
}
