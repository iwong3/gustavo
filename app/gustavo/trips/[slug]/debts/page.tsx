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
    planNetCents,
    planSettlements,
    roundToTotal,
    toCents,
} from '@/lib/debt-proof'
import { queryKeys } from '@/lib/query-keys'
import type { Expense, SettlementRecord, SettlePlan, UserSummary } from '@/lib/types'
import { BalanceCard, type PlanPaymentRow } from 'components/debt/balance-card'
import { useDebtsView } from 'components/debt/debts-view-store'
import { DebtsHelp } from 'components/debt/debts-help'
import { PlanPopover } from 'components/debt/plan-popover'
import { ProofList, type ProofRow } from 'components/debt/proof-list'
import { PaymentsCard, type OtherPaymentRow } from 'components/debt/payments-card'
import { PersonPicker } from 'components/insights/person-picker'
import { PageInfo } from 'components/page-info'
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
    // The sheet explains what's left; once everything is paid it walks through
    // the plan as it stood before anyone paid, marking the payments made
    const allPaid = payments.length === 0 && settlementRecords.length > 0
    const sheetDebtMap = allPaid ? expenseDebtMap : debtMap
    const sheetPayments = useMemo(
        () => (allPaid ? planSettlements(plan, expenseDebtMap, participants) : payments),
        [allPaid, plan, expenseDebtMap, participants, payments]
    )
    const totalCents = planNetCents(payments, personId)
    const steps = useMemo(
        () => balanceSteps(personId, expenseDebtMap, settlementRecords, participants, totalCents),
        [personId, expenseDebtMap, settlementRecords, participants, totalCents]
    )
    // ── Settling ────────────────────────────────────────────────────────────
    const [pending, setPending] = useState<string | null>(null)
    const [planOpen, setPlanOpen] = useState(false)
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
        const rows: ProofRow[] = effects.map((e, i) => ({
            expense: e.expense,
            cents: cents[i],
            usd: e.usd,
            splitCount: e.splitCount,
            treated: e.expense.coveredParticipants.length > 0,
        }))
        const title = deferredSelected === 'all' ? 'Every expense' : `With ${nameOf(deferredSelected as unknown as number)}`
        return { rows, target, title }
    }, [deferredSelected, expenses, getUsdValue, personId, participants.length, steps, nameOf])

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
                    <DebtsHelp />
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
                onHowItWorks={() => setPlanOpen(true)}
                viewKey={`${personId}:${plan}`}
            />

            {/* Every payment, above the expenses a tapped row opens — so
                nothing in it moves when they do */}
            <PaymentsCard
                mine={mine}
                others={others}
                settled={settled}
                isYou={isYou}
                personName={personName}
                youId={trip.currentUserId}
                onSettle={settle}
                onUndo={undo}
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
                        onTap={openExpense}
                        hrefOf={expenseHref}
                        tripStartDate={trip.startDate}
                        tripDays={tripDays}
                    />
                </Box>
            )}


            <PlanPopover
                open={planOpen}
                onClose={() => setPlanOpen(false)}
                plan={plan}
                payments={sheetPayments}
                debtMap={sheetDebtMap}
                settled={allPaid ? settlementRecords : undefined}
                participants={participants}
                currentUserId={trip.currentUserId}
            />

        </Box>
    )
}
