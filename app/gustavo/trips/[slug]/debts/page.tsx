'use client'

import { Box, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'

import { colors } from '@/lib/colors'
import type { Settlement } from '@/lib/debt'
import {
    balanceSteps,
    expenseBalanceEffects,
    lockedPlan,
    planHandoffs,
    planNetCents,
    planSettlements,
    roundToTotal,
    toCents,
} from '@/lib/debt-proof'
import { queryKeys } from '@/lib/query-keys'
import type { Expense, SettlementRecord, SettlePlan, UserSummary } from '@/lib/types'
import { BalanceCard, type PlanPaymentRow } from 'components/debt/balance-card'
import { useDebtsView } from 'components/debt/debts-view-store'
import { handoffLine } from 'components/debt/handoff-text'
import { ProofList, type ProofRow } from 'components/debt/proof-list'
import { EveryoneElseCard, SettledCard, type OtherPaymentRow } from 'components/debt/trip-payments'
import { PersonPicker } from 'components/insights/person-picker'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'
import { PageTitleRow } from 'components/page-title-row'
import { SlidingToggle } from 'components/sliding-toggle'
import { showToast } from 'components/toast-store'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { addSettlement, deleteSettlement } from 'utils/api'
import { formatUsd } from 'utils/currency'
import { canSettlePayment } from 'utils/permissions'

const PLAN_OPTIONS = [
    { value: 'fewest', label: 'Fewest payments' },
    { value: 'direct', label: 'Pay who you owe' },
]
const PLAN_NAME: Record<SettlePlan, string> = { fewest: 'Fewest payments', direct: 'Pay who you owe' }

const same = (a: number | string, b: number | string) => String(a) === String(b)
const payKey = (s: Pick<Settlement, 'debtorId' | 'creditorId'>) => `${s.debtorId}>${s.creditorId}`

export default function DebtsPage() {
    const { trip } = useTripData()
    const { debtMap, expenseDebtMap, participants, settlementRecords, expenses, getUsdValue } = useSpendData()
    const router = useRouter()
    const queryClient = useQueryClient()
    const view = useDebtsView(trip.id)

    const participantById = useMemo(() => {
        const map = new Map<string, UserSummary>()
        for (const p of participants) map.set(String(p.id), p)
        return map
    }, [participants])
    const nameOf = useCallback((id: number) => participantById.get(String(id))?.firstName ?? '?', [participantById])

    const person =
        participantById.get(String(view.personId ?? trip.currentUserId)) ??
        participantById.get(String(trip.currentUserId)) ??
        participants[0]
    const personId = person?.id ?? trip.currentUserId
    const isYou = same(personId, trip.currentUserId)
    const personName = isYou ? 'You' : (person?.firstName ?? '?')

    // The first payment locks the trip to its plan; until then either can be viewed
    const locked = lockedPlan(settlementRecords)
    const plan: SettlePlan = locked ?? view.plan

    const payments = useMemo(() => planSettlements(plan, debtMap, participants), [plan, debtMap, participants])
    const totalCents = planNetCents(payments, personId)
    const steps = useMemo(
        () => balanceSteps(personId, expenseDebtMap, settlementRecords, participants, totalCents),
        [personId, expenseDebtMap, settlementRecords, participants, totalCents]
    )
    const whyLines = useMemo(
        () =>
            planHandoffs(personId, debtMap, payments, participants).map((h) =>
                handoffLine(h, { currentUserId: trip.currentUserId, nameOf })
            ),
        [personId, debtMap, payments, participants, trip.currentUserId, nameOf]
    )

    // ── Settling ────────────────────────────────────────────────────────────
    const [pending, setPending] = useState<string | null>(null)
    const settlementsKey = queryKeys.trips.settlements(trip.id)
    const canSettle = (s: Settlement) =>
        canSettlePayment(
            trip.userRole,
            trip.isAdmin,
            same(s.debtorId, trip.currentUserId) || same(s.creditorId, trip.currentUserId)
        )

    const undo = useCallback(
        async (recordId: number) => {
            const before = queryClient.getQueryData<SettlementRecord[]>(settlementsKey)
            queryClient.setQueryData<SettlementRecord[]>(settlementsKey, (old) => old?.filter((r) => !same(r.id, recordId)))
            try {
                await deleteSettlement(trip.id, recordId)
            } catch (err) {
                queryClient.setQueryData(settlementsKey, before)
                showToast(err instanceof Error ? err.message : 'Couldn’t undo that payment')
            } finally {
                queryClient.invalidateQueries({ queryKey: settlementsKey })
            }
        },
        [queryClient, settlementsKey, trip.id]
    )

    // One tap: recorded straight away (optimistically), with Undo on the toast
    const settle = useCallback(
        async (key: string) => {
            const s = payments.find((p) => payKey(p) === key)
            if (!s || pending) return
            setPending(key)
            const before = queryClient.getQueryData<SettlementRecord[]>(settlementsKey)
            const optimistic: SettlementRecord = {
                id: `pending-${key}` as unknown as number,
                fromUserId: s.debtorId,
                toUserId: s.creditorId,
                amountUsd: s.amount,
                plan,
                note: null,
                settledOn: dayjs().format('YYYY-MM-DD'),
                createdBy: trip.currentUserId,
                createdAt: new Date().toISOString(),
            }
            queryClient.setQueryData<SettlementRecord[]>(settlementsKey, (old) => [optimistic, ...(old ?? [])])
            try {
                const { id } = await addSettlement(trip.id, {
                    fromUserId: s.debtorId,
                    toUserId: s.creditorId,
                    amountUsd: s.amount,
                    plan,
                })
                const who = (uid: number) => (same(uid, trip.currentUserId) ? 'You' : nameOf(uid))
                showToast(`${who(s.debtorId)} → ${who(s.creditorId)} · ${formatUsd(s.amount, 2)} settled`, 'success', {
                    label: 'Undo',
                    onClick: () => undo(id),
                })
            } catch (err) {
                queryClient.setQueryData(settlementsKey, before)
                showToast(err instanceof Error ? err.message : 'Couldn’t record that payment')
            } finally {
                setPending(null)
                queryClient.invalidateQueries({ queryKey: settlementsKey })
            }
        },
        [payments, pending, queryClient, settlementsKey, plan, trip.currentUserId, trip.id, nameOf, undo]
    )

    // ── Rows ────────────────────────────────────────────────────────────────
    const mine: PlanPaymentRow[] = payments
        .filter((s) => same(s.debtorId, personId) || same(s.creditorId, personId))
        .map((s) => {
            const outgoing = same(s.debtorId, personId)
            const counterparty = participantById.get(String(outgoing ? s.creditorId : s.debtorId))!
            return {
                key: payKey(s),
                counterparty,
                cents: toCents(s.amount),
                outgoing,
                venmo:
                    isYou && outgoing && counterparty?.venmoUrl
                        ? { url: counterparty.venmoUrl, note: trip.name }
                        : null,
                canSettle: canSettle(s),
                pending: pending === payKey(s),
            }
        })
        .filter((r) => r.counterparty)
        .sort((a, b) => Number(b.outgoing) - Number(a.outgoing) || b.cents - a.cents)

    const others: OtherPaymentRow[] = payments
        .filter((s) => !same(s.debtorId, personId) && !same(s.creditorId, personId))
        .map((s) => ({
            key: payKey(s),
            debtor: participantById.get(String(s.debtorId))!,
            creditor: participantById.get(String(s.creditorId))!,
            cents: toCents(s.amount),
            canSettle: canSettle(s),
            pending: pending === payKey(s),
        }))
        .filter((r) => r.debtor && r.creditor)
        .sort((a, b) => a.debtor.firstName.localeCompare(b.debtor.firstName) || b.cents - a.cents)

    const settled = settlementRecords
        .filter((r) => Number.isFinite(r.amountUsd))
        .map((r) => ({
            id: r.id,
            from: participantById.get(String(r.fromUserId)),
            to: participantById.get(String(r.toUserId)),
            cents: toCents(r.amountUsd),
            settledOn: r.settledOn,
            canUndo:
                !String(r.id).startsWith('pending-') &&
                canSettlePayment(
                    trip.userRole,
                    trip.isAdmin,
                    same(r.fromUserId, trip.currentUserId) || same(r.toUserId, trip.currentUserId)
                ),
        }))

    // ── The expenses behind a selected row ─────────────────────────────────
    // A row that's no longer on the chart (switched person) clears itself
    const selected =
        view.selected === 'all' || steps.some((s) => s.kind === 'person' && String(s.userId) === view.selected)
            ? view.selected
            : null
    const deferredSelected = useDeferredValue(selected)

    const proof = useMemo(() => {
        if (deferredSelected === null) return null
        const effects: { expense: Expense; usd: number; value: number; splitCount: number }[] = []
        for (const expense of expenses) {
            const usd = getUsdValue(expense)
            const byPerson = expenseBalanceEffects(expense, personId, usd, participants.length)
            let value = 0
            if (deferredSelected === 'all') byPerson.forEach((v) => (value += v))
            else value = byPerson.get(deferredSelected) ?? 0
            if (Math.abs(value) < 0.005) continue
            const splitCount = expense.isEveryone ? participants.length : expense.splitBetween.length
            effects.push({ expense, usd, value, splitCount })
        }
        // Anchor to the chart's own rounded row(s) so the list adds up to it
        const personSteps = steps.filter((s) => s.kind === 'person')
        const target =
            deferredSelected === 'all'
                ? personSteps.reduce((t, s) => t + s.cents, 0)
                : (personSteps.find((s) => String(s.userId) === deferredSelected)?.cents ?? 0)
        const cents = roundToTotal(effects.map((e) => e.value), target)
        const rows: ProofRow[] = effects.map((e, i) => {
            const payer = same(e.expense.paidBy.id, trip.currentUserId) ? 'You' : e.expense.paidBy.firstName
            const treated = e.expense.coveredParticipants.length
            return {
                expense: e.expense,
                cents: cents[i],
                subline: [
                    `${payer} paid ${formatUsd(e.usd, 2)}`,
                    `split ${e.splitCount} ${e.splitCount === 1 ? 'way' : 'ways'}`,
                    treated > 0 ? `${treated} treated` : null,
                ]
                    .filter(Boolean)
                    .join(' · '),
            }
        })
        const title = deferredSelected === 'all' ? 'Every expense' : `With ${nameOf(deferredSelected as unknown as number)}`
        return { rows, target, title }
    }, [deferredSelected, expenses, getUsdValue, personId, participants.length, steps, trip.currentUserId, nameOf])

    // ?from=debts brings the header back button here (see utils/back-href.ts)
    const expenseHref = useCallback(
        (expense: Expense) => `/gustavo/trips/${trip.slug}/expenses/${expense.id}?from=debts`,
        [trip.slug]
    )
    const openExpense = useCallback((expense: Expense) => router.push(expenseHref(expense)), [router, expenseHref])

    const tripDays =
        trip.startDate && trip.endDate
            ? dayjs(trip.endDate + 'T00:00:00').diff(dayjs(trip.startDate + 'T00:00:00'), 'day') + 1
            : undefined

    const summary =
        totalCents === 0
            ? 'all square'
            : `${totalCents < 0 ? (isYou ? 'pay' : 'pays') : isYou ? 'get' : 'gets'} ${formatUsd(Math.abs(totalCents) / 100, 2)}`

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                paddingX: 2,
                paddingY: 2,
                gap: 1.5,
            }}>
            <PageTitleRow title="Debts">
                <PageInfo title="How debts work">
                    <PageInfoSection title="Two ways to settle">
                        <b>Fewest payments</b> settles the whole group in as few
                        transfers as possible, so you might pay someone you never
                        borrowed from. <b>Pay who you owe</b> only ever pays people
                        you owe, and cancels out loops (you owe Jenny, Jenny owes
                        Sam, Sam owes you). Both land everyone on exactly the same
                        balance.
                    </PageInfoSection>
                    <PageInfoSection title="One plan per trip">
                        Anyone can switch plans until the first payment is settled.
                        After that the trip stays on that plan, so the two never mix.
                        Undo every payment to switch again.
                    </PageInfoSection>
                    <PageInfoSection title="Checking the math">
                        The chart builds your total from everything between you and
                        each person. Tap a row for the expenses behind it, and tap an
                        expense to open it. <b>Why these people?</b> explains any
                        payment that goes to someone you don&apos;t owe directly.
                    </PageInfoSection>
                    <PageInfoSection title="Settling">
                        Tap <b>Settle</b> once the money has actually moved. It&apos;s
                        recorded for the whole group straight away; <b>Undo</b> on
                        the message, or swipe the payment in <b>Settled</b>, takes it
                        back. Only the payer, the receiver or a trip admin can settle
                        or undo a payment.
                    </PageInfoSection>
                    <PageInfoNote>Tap the avatar to see anyone&apos;s debts.</PageInfoNote>
                </PageInfo>
            </PageTitleRow>

            <PersonPicker
                participants={participants}
                selectedId={personId}
                currentUserId={trip.currentUserId}
                onSelect={view.setPersonId}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{personName}</Typography>
                <Typography noWrap sx={{ fontSize: 12, color: colors.primaryBrown }}>
                    · {summary}
                </Typography>
            </PersonPicker>

            {/* Same toggle once locked: the settled plan keeps its yellow + a
                lock, the other fades and explains how to switch back */}
            <SlidingToggle
                value={plan}
                options={PLAN_OPTIONS}
                onChange={(v) => view.setPlan(v as SettlePlan)}
                locked={locked !== null}
                onLockedTap={() =>
                    showToast(
                        `Payments were settled with ${PLAN_NAME[plan]}. Undo them all to switch plans.`,
                        'info'
                    )
                }
                fontSize={13}
                borderWidth={1}
            />

            <BalanceCard
                steps={steps}
                totalCents={totalCents}
                isYou={isYou}
                personName={personName}
                participantById={participantById}
                payments={mine}
                selected={selected}
                onSelect={view.setSelected}
                onSettle={settle}
                whyLines={whyLines}
            />

            {proof && (
                <Box
                    key={String(deferredSelected)}
                    sx={{
                        'animation': 'proofIn 150ms ease-out',
                        '@keyframes proofIn': {
                            from: { opacity: 0, transform: 'translateY(4px)' },
                            to: { opacity: 1, transform: 'none' },
                        },
                        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    }}>
                    <ProofList
                        title={proof.title}
                        rows={proof.rows}
                        totalCents={proof.target}
                        onTap={openExpense}
                        hrefOf={expenseHref}
                        tripStartDate={trip.startDate}
                        tripDays={tripDays}
                    />
                </Box>
            )}

            {others.length > 0 && <EveryoneElseCard payments={others} youId={trip.currentUserId} onSettle={settle} />}
            {settled.length > 0 && <SettledCard records={settled} youId={trip.currentUserId} onUndo={undo} />}
        </Box>
    )
}
