'use client'

import {
    Box,
    Button,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { cardSx, colors } from '@/lib/colors'
import {
    directPairwiseSettlements,
    simplifyDebts,
    sortSettlements,
    type Settlement,
} from '@/lib/debt'
import {
    destructiveButtonSx,
    dialogPaperSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import { queryKeys } from '@/lib/query-keys'
import type { SettlementRecord, UserSummary } from '@/lib/types'
import { IconArrowsExchange, IconChevronDown, IconChevronUp } from '@tabler/icons-react'

import { MoneyMap } from 'components/debt/money-map'
import { SettleProgressCard, SettleRow, SettledRow } from 'components/debt/settle-up'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'
import { PersonSwitcher } from 'components/person-switcher'
import { PrefetchOnVisible } from 'components/prefetch-on-visible'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { addSettlement, deleteSettlement } from 'utils/api'
import { InitialsIcon } from 'utils/icons'

const OWE_RED = '#c0392b'
const OWED_GREEN = '#2e7d32'

const formatUsd = (n: number | null | undefined) =>
    Number.isFinite(n)
        ? n!.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
          })
        : '—'

function StatBox({
    value,
    label,
    people,
    prefix,
    tone,
}: {
    value: number
    label: string
    people: UserSummary[]
    prefix: string
    tone: 'owe' | 'owed'
}) {
    return (
        <Box
            sx={{
                ...cardSx,
                flex: 1,
                backgroundColor: tone === 'owe' ? '#fdf0ee' : '#eef5ee',
                paddingX: 1.5,
                paddingY: 1,
            }}>
            <Typography
                sx={{
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                    color: tone === 'owe' ? OWE_RED : OWED_GREEN,
                }}>
                {value > 0 ? formatUsd(value) : '$0'}
            </Typography>
            <Typography
                sx={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: colors.primaryBrown,
                    marginTop: 0.25,
                }}>
                {label}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    marginTop: 0.5,
                    minHeight: 22,
                }}>
                {value > 0 ? (
                    <>
                        <Typography
                            sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
                            {prefix}
                        </Typography>
                        {people.map((p) => (
                            <InitialsIcon
                                key={p.id}
                                name={p.firstName}
                                initials={p.initials}
                                iconColor={p.iconColor}
                                sx={{
                                    width: 22,
                                    height: 22,
                                    fontSize: 8.5,
                                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                }}
                            />
                        ))}
                    </>
                ) : (
                    <Typography
                        sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
                        all clear
                    </Typography>
                )}
            </Box>
        </Box>
    )
}

/** Uppercase section header with an optional right-aligned tally. */
function SectionHead({ label, right }: { label: string; right?: string }) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 1,
                marginTop: 0.5,
                paddingX: 0.25,
            }}>
            <Typography
                sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: colors.primaryBrown,
                }}>
                {label}
            </Typography>
            {right && (
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: colors.primaryBlack,
                    }}>
                    {right}
                </Typography>
            )}
        </Box>
    )
}

export default function DebtsPage() {
    const { trip } = useTripData()
    const { debtMap, participants, settlementRecords } = useSpendData()
    const router = useRouter()
    const queryClient = useQueryClient()

    const defaultPersonId =
        participants.find((p) => p.id === trip.currentUserId)?.id ??
        participants[0]?.id ??
        0
    const [personId, setPersonId] = useState<number>(defaultPersonId)

    const participantById = useMemo(() => {
        const map = new Map<number, UserSummary>()
        for (const p of participants) map.set(p.id, p)
        return map
    }, [participants])

    // 'simplified' = fewest transactions (may reroute through a third person);
    // 'direct' = every pair's actual net, nothing rerouted.
    const [plan, setPlan] = useState<'simplified' | 'direct'>('simplified')

    const settlements = useMemo(
        () =>
            sortSettlements(
                plan === 'direct'
                    ? directPairwiseSettlements(debtMap, participants)
                    : simplifyDebts(debtMap, participants),
                personId,
                participantById
            ),
        [plan, debtMap, participants, personId, participantById]
    )

    const youOwe = settlements.filter((s) => s.debtorId === personId)
    const youOwed = settlements.filter((s) => s.creditorId === personId)
    const others = settlements.filter(
        (s) => s.debtorId !== personId && s.creditorId !== personId
    )
    const sum = (list: Settlement[]) => list.reduce((t, s) => t + s.amount, 0)
    const oweSum = sum(youOwe)
    const owedSum = sum(youOwed)
    const allSettled = settlements.length === 0

    const settledSum = settlementRecords.reduce(
        (t, r) => t + (Number.isFinite(r.amountUsd) ? r.amountUsd : 0),
        0
    )

    // Settled money stays visible on the map — one ghost ribbon per pair
    const settledFlows = useMemo(() => {
        const byPair = new Map<string, Settlement>()
        for (const r of settlementRecords) {
            if (!Number.isFinite(r.amountUsd)) continue
            const key = `${r.fromUserId}-${r.toUserId}`
            const prev = byPair.get(key)
            if (prev) {
                prev.amount += r.amountUsd
            } else {
                byPair.set(key, {
                    debtorId: r.fromUserId,
                    creditorId: r.toUserId,
                    amount: r.amountUsd,
                })
            }
        }
        return Array.from(byPair.values())
    }, [settlementRecords])

    const [othersOpen, setOthersOpen] = useState(false)

    // Mark-paid / undo confirmation state
    const [markTarget, setMarkTarget] = useState<Settlement | null>(null)
    const [undoTarget, setUndoTarget] = useState<SettlementRecord | null>(null)
    const [busy, setBusy] = useState(false)
    const [dialogError, setDialogError] = useState<string | null>(null)

    const openDetail = (s: Settlement) => {
        router.push(
            `/gustavo/trips/${trip.slug}/debts/${s.debtorId}-${s.creditorId}`
        )
    }

    const nameOf = (id: number) => participantById.get(id)?.firstName ?? '?'
    const isSelf = String(personId) === String(trip.currentUserId)
    const personName = nameOf(personId)

    const refreshSettlements = () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.trips.settlements(trip.id),
        })

    const confirmMarkPaid = async () => {
        if (!markTarget) return
        setBusy(true)
        setDialogError(null)
        try {
            await addSettlement(trip.id, {
                fromUserId: markTarget.debtorId,
                toUserId: markTarget.creditorId,
                amountUsd: markTarget.amount,
            })
            await refreshSettlements()
            setMarkTarget(null)
        } catch (err) {
            setDialogError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setBusy(false)
        }
    }

    const confirmUndo = async () => {
        if (!undoTarget) return
        setBusy(true)
        setDialogError(null)
        try {
            await deleteSettlement(trip.id, undoTarget.id)
            await refreshSettlements()
            setUndoTarget(null)
        } catch (err) {
            setDialogError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setBusy(false)
        }
    }

    const renderRows = (list: Settlement[]) =>
        list.map((s) => {
            const debtor = participantById.get(s.debtorId)
            const creditor = participantById.get(s.creditorId)
            if (!debtor || !creditor) return null
            const showVenmo =
                isSelf &&
                String(s.debtorId) === String(personId) &&
                creditor.venmoUrl
            return (
                <PrefetchOnVisible
                    key={`${s.debtorId}-${s.creditorId}`}
                    href={`/gustavo/trips/${trip.slug}/debts/${s.debtorId}-${s.creditorId}`}>
                    <SettleRow
                        debtor={debtor}
                        creditor={creditor}
                        amount={s.amount}
                        perspectiveId={personId}
                        youId={trip.currentUserId}
                        venmo={
                            showVenmo
                                ? { url: creditor.venmoUrl!, note: trip.name }
                                : null
                        }
                        onTap={() => openDetail(s)}
                        onMarkPaid={() => {
                            setDialogError(null)
                            setMarkTarget(s)
                        }}
                    />
                </PrefetchOnVisible>
            )
        })

    // Unique faces across the "between others" payments, for the folded header
    const otherFaces = useMemo(() => {
        const seen = new Map<string, UserSummary>()
        for (const s of others) {
            for (const id of [s.debtorId, s.creditorId]) {
                const u = participantById.get(id)
                if (u && !seen.has(String(id))) seen.set(String(id), u)
            }
        }
        return Array.from(seen.values()).slice(0, 5)
    }, [others, participantById])

    const markDebtor = markTarget ? participantById.get(markTarget.debtorId) : null
    const markCreditor = markTarget ? participantById.get(markTarget.creditorId) : null

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
            {/* Title row: whose view (left) + plan pill and page help (right) */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                    }}>
                    <Typography
                        noWrap
                        sx={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: colors.primaryBlack,
                            paddingX: 0.25,
                            minWidth: 0,
                        }}>
                        {isSelf ? 'My Debts' : `${personName}'s Debts`}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexShrink: 0,
                        }}>
                        {!allSettled && (
                            <Box
                                onClick={() =>
                                    setPlan(
                                        plan === 'simplified'
                                            ? 'direct'
                                            : 'simplified'
                                    )
                                }
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': 0.5,
                                    'height': 30,
                                    'paddingX': 1.25,
                                    'borderRadius': '15px',
                                    'border': `1px solid ${colors.primaryBlack}`,
                                    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    'backgroundColor': colors.primaryYellow,
                                    'cursor': 'pointer',
                                    'userSelect': 'none',
                                    '&:active': {
                                        boxShadow: 'none',
                                        transform: 'translate(1.5px, 1.5px)',
                                    },
                                    'transition':
                                        'transform 0.1s, box-shadow 0.1s',
                                }}>
                                <Typography
                                    sx={{ fontSize: 12.5, fontWeight: 700 }}>
                                    {plan === 'simplified'
                                        ? 'Simplified'
                                        : 'All debts'}
                                </Typography>
                                <IconArrowsExchange
                                    size={15}
                                    stroke={2}
                                    color={colors.primaryBlack}
                                />
                            </Box>
                        )}
                        <PageInfo title="How debts work">
                            <PageInfoSection title="All debts">
                                Each pair&apos;s actual net. If Alice covered
                                things for Bob, Bob owes Alice — nothing is
                                rerouted.
                            </PageInfoSection>
                            <PageInfoSection title="Simplified">
                                The fewest payments that settle everyone. Money
                                may be rerouted — you might pay someone who
                                never covered you.
                            </PageInfoSection>
                            <PageInfoSection title="Settling">
                                Tap <b>Settle</b> on a payment once the money
                                has actually moved. It&apos;s recorded for the
                                whole group, balances update, and the payment
                                drops into <b>Settled</b> below — where ✕
                                undoes it. On the map, settled money stays
                                visible as faded ✓ ribbons.
                            </PageInfoSection>
                            <PageInfoNote>
                                Both plans settle everyone to the same final
                                balances — simplified just gets there in fewer
                                payments. Switch anytime with the{' '}
                                <b>Simplified / All debts</b> pill up top.
                            </PageInfoNote>
                            <PageInfoNote>
                                On the map, tap a ribbon or a person to
                                highlight their flows. Tap a row below it to see
                                the expenses behind that debt.
                            </PageInfoNote>
                        </PageInfo>
                    </Box>
                </Box>
                <PersonSwitcher
                    participants={participants}
                    selectedId={personId}
                    onSelect={setPersonId}
                />
            </Box>

            {/* Owe / owed stats */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <StatBox
                    value={oweSum}
                    label={isSelf ? 'You owe' : `${personName} owes`}
                    people={youOwe.map((s) => participantById.get(s.creditorId)!).filter(Boolean)}
                    prefix="to"
                    tone="owe"
                />
                <StatBox
                    value={owedSum}
                    label={isSelf ? "You're owed" : `${personName} is owed`}
                    people={youOwed.map((s) => participantById.get(s.debtorId)!).filter(Boolean)}
                    prefix="by"
                    tone="owed"
                />
            </Box>

            {allSettled && (
                <Box
                    sx={{
                        ...cardSx,
                        backgroundColor: '#d4edda',
                        padding: 2,
                        textAlign: 'center',
                    }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        Everyone is settled up! 🎉
                    </Typography>
                </Box>
            )}

            {/* Money map — settled flows stay on it as ghost ribbons */}
            {(settlements.length > 0 || settledFlows.length > 0) && (
                <>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 0.5,
                            paddingX: 0.25,
                        }}>
                        <Typography
                            sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: colors.primaryBrown,
                            }}>
                            The money map
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: colors.primaryBrown,
                            }}>
                            tap a ribbon or person to highlight
                        </Typography>
                    </Box>
                    <MoneyMap
                        settlements={settlements}
                        settledFlows={settledFlows}
                        participantById={participantById}
                        youId={personId}
                    />
                </>
            )}

            {/* Trip-level settling progress — heads the payment list */}
            {(settlements.length > 0 || settlementRecords.length > 0) && (
                <>
                    <SectionHead label="Trip debts" />
                    <SettleProgressCard
                        settledCount={settlementRecords.length}
                        settledSum={settledSum}
                        remainingCount={settlements.length}
                        remainingSum={sum(settlements)}
                    />
                </>
            )}

            {/* Outstanding payments, grouped by direction */}
            {youOwe.length > 0 && (
                <>
                    <SectionHead
                        label={isSelf ? 'You pay' : `${personName} pays`}
                        right={formatUsd(oweSum)}
                    />
                    {renderRows(youOwe)}
                </>
            )}
            {youOwed.length > 0 && (
                <>
                    <SectionHead
                        label={isSelf ? 'Coming to you' : `Coming to ${personName}`}
                        right={formatUsd(owedSum)}
                    />
                    {renderRows(youOwed)}
                </>
            )}
            {others.length > 0 && (
                <>
                    <SectionHead
                        label="Between others"
                        right={formatUsd(sum(others))}
                    />
                    <Box>
                        <Box
                            onClick={() => setOthersOpen(!othersOpen)}
                            sx={{
                                ...cardSx,
                                'display': 'flex',
                                'alignItems': 'center',
                                'gap': 1.25,
                                'paddingX': 1.5,
                                'paddingY': 1.1,
                                'cursor': 'pointer',
                                'userSelect': 'none',
                                '&:active': {
                                    boxShadow: 'none',
                                    transform: 'translate(2px, 2px)',
                                },
                                'transition': 'transform 0.1s, box-shadow 0.1s',
                            }}>
                            <Box sx={{ display: 'flex', flexShrink: 0 }}>
                                {otherFaces.map((u, i) => (
                                    <InitialsIcon
                                        key={u.id}
                                        name={u.firstName}
                                        initials={u.initials}
                                        iconColor={u.iconColor}
                                        sx={{
                                            width: 24,
                                            height: 24,
                                            fontSize: 9,
                                            marginLeft: i > 0 ? '-6px' : 0,
                                        }}
                                    />
                                ))}
                            </Box>
                            <Typography
                                sx={{ flex: 1, fontSize: 13, fontWeight: 700 }}>
                                {others.length}{' '}
                                {others.length === 1 ? 'payment' : 'payments'}
                            </Typography>
                            {othersOpen ? (
                                <IconChevronUp size={17} stroke={2} color={colors.primaryBlack} />
                            ) : (
                                <IconChevronDown size={17} stroke={2} color={colors.primaryBlack} />
                            )}
                        </Box>
                        {/* Animated so expanding doesn't jolt the page */}
                        <Collapse in={othersOpen} unmountOnExit>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5,
                                    paddingTop: 1.5,
                                }}>
                                {renderRows(others)}
                            </Box>
                        </Collapse>
                    </Box>
                </>
            )}

            {/* Recorded payments */}
            {settlementRecords.length > 0 && (
                <>
                    <SectionHead label="Settled" right={formatUsd(settledSum)} />
                    {settlementRecords.map((r) => (
                        <SettledRow
                            key={r.id}
                            record={r}
                            from={participantById.get(r.fromUserId)}
                            to={participantById.get(r.toUserId)}
                            youId={trip.currentUserId}
                            onUndo={() => {
                                setDialogError(null)
                                setUndoTarget(r)
                            }}
                        />
                    ))}
                </>
            )}

            {/* Mark-as-paid confirmation */}
            <Dialog
                open={markTarget !== null}
                onClose={() => !busy && setMarkTarget(null)}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: dialogPaperSx } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
                    Mark as paid?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14 }}>
                        <strong>
                            {markDebtor?.firstName ?? '?'} →{' '}
                            {markCreditor?.firstName ?? '?'}
                        </strong>{' '}
                        · <strong>{formatUsd(markTarget?.amount)}</strong>
                    </Typography>
                    <Typography
                        sx={{ fontSize: 12.5, color: 'text.secondary', marginTop: 1 }}>
                        Records the payment for the whole group and updates
                        everyone&apos;s balances. You can undo it later from the
                        Settled list.
                    </Typography>
                    {dialogError && (
                        <Typography
                            sx={{ fontSize: 12.5, color: colors.primaryRed, marginTop: 1 }}>
                            {dialogError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions
                    sx={{ padding: '8px 24px 16px', justifyContent: 'space-between' }}>
                    <Button
                        onClick={() => setMarkTarget(null)}
                        disabled={busy}
                        sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button onClick={confirmMarkPaid} disabled={busy} sx={primaryButtonSx}>
                        {busy ? 'Saving…' : 'Mark paid'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Undo confirmation */}
            <Dialog
                open={undoTarget !== null}
                onClose={() => !busy && setUndoTarget(null)}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: dialogPaperSx } }}>
                <DialogTitle
                    sx={{ fontWeight: 700, fontSize: 18, color: colors.primaryRed }}>
                    Undo this payment?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14 }}>
                        <strong>
                            {undoTarget
                                ? `${nameOf(undoTarget.fromUserId)} → ${nameOf(undoTarget.toUserId)}`
                                : ''}
                        </strong>{' '}
                        · <strong>{formatUsd(undoTarget?.amountUsd)}</strong>
                    </Typography>
                    <Typography
                        sx={{ fontSize: 12.5, color: 'text.secondary', marginTop: 1 }}>
                        Use this if the payment was marked by mistake — the
                        debt shows as owed again.
                    </Typography>
                    {dialogError && (
                        <Typography
                            sx={{ fontSize: 12.5, color: colors.primaryRed, marginTop: 1 }}>
                            {dialogError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions
                    sx={{ padding: '8px 24px 16px', justifyContent: 'space-between' }}>
                    <Button
                        onClick={() => setUndoTarget(null)}
                        disabled={busy}
                        sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button onClick={confirmUndo} disabled={busy} sx={destructiveButtonSx}>
                        {busy ? 'Undoing…' : 'Undo payment'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
