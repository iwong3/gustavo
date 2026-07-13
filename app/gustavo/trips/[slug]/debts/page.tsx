'use client'

import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { cardSx, colors } from '@/lib/colors'
import { simplifyDebts, sortSettlements, type Settlement } from '@/lib/debt'
import type { UserSummary } from '@/lib/types'
import { MoneyMap } from 'components/debt/money-map'
import { PersonSwitcher } from 'components/person-switcher'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
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

export default function DebtsPage() {
    const { trip } = useTripData()
    const { debtMap, participants } = useSpendData()
    const router = useRouter()

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

    // Simplified settle-up plan, viewer's payments first
    const settlements = useMemo(
        () =>
            sortSettlements(
                simplifyDebts(debtMap, participants),
                personId,
                participantById
            ),
        [debtMap, participants, personId, participantById]
    )

    const youOwe = settlements.filter((s) => s.debtorId === personId)
    const youOwed = settlements.filter((s) => s.creditorId === personId)
    const oweSum = youOwe.reduce((t, s) => t + s.amount, 0)
    const owedSum = youOwed.reduce((t, s) => t + s.amount, 0)
    const allSettled = settlements.length === 0

    const openDetail = (s: Settlement) => {
        router.push(
            `/gustavo/trips/${trip.slug}/debts/${s.debtorId}-${s.creditorId}`
        )
    }

    const nameOf = (id: number) => participantById.get(id)?.firstName ?? '?'

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
            <PersonSwitcher
                participants={participants}
                selectedId={personId}
                onSelect={setPersonId}
                label="View as"
            />

            {/* Owe / owed stats */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <StatBox
                    value={oweSum}
                    label="You owe"
                    people={youOwe.map((s) => participantById.get(s.creditorId)!).filter(Boolean)}
                    prefix="to"
                    tone="owe"
                />
                <StatBox
                    value={owedSum}
                    label="You're owed"
                    people={youOwed.map((s) => participantById.get(s.debtorId)!).filter(Boolean)}
                    prefix="by"
                    tone="owed"
                />
            </Box>

            {allSettled ? (
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
            ) : (
                <>
                    {/* Money map */}
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
                            tap a ribbon for the receipts
                        </Typography>
                    </Box>
                    <MoneyMap
                        settlements={settlements}
                        participantById={participantById}
                        youId={personId}
                        onFlowTap={openDetail}
                    />

                    {/* Settle-up rows */}
                    <Typography
                        sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: colors.primaryBrown,
                            marginTop: 0.5,
                            paddingX: 0.25,
                        }}>
                        Settle up ({settlements.length}{' '}
                        {settlements.length === 1 ? 'payment' : 'payments'})
                    </Typography>
                    {settlements.map((s) => {
                        const mine =
                            s.debtorId === personId || s.creditorId === personId
                        const debtor = participantById.get(s.debtorId)
                        return (
                            <Box
                                key={`${s.debtorId}-${s.creditorId}`}
                                onClick={() => openDetail(s)}
                                sx={{
                                    ...cardSx,
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': 1.25,
                                    'paddingX': 1.5,
                                    'paddingY': 1.25,
                                    'cursor': 'pointer',
                                    'userSelect': 'none',
                                    'backgroundColor': mine
                                        ? colors.secondaryYellow
                                        : colors.primaryWhite,
                                    '&:active': {
                                        boxShadow: 'none',
                                        transform: 'translate(2px, 2px)',
                                    },
                                    'transition':
                                        'transform 0.1s, box-shadow 0.1s',
                                }}>
                                {debtor && (
                                    <InitialsIcon
                                        name={debtor.firstName}
                                        initials={debtor.initials}
                                        iconColor={debtor.iconColor}
                                        sx={{ width: 28, height: 28, fontSize: 10 }}
                                    />
                                )}
                                <Typography
                                    sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        fontSize: 13.5,
                                        fontWeight: 600,
                                    }}>
                                    <b>
                                        {s.debtorId === personId
                                            ? 'You'
                                            : nameOf(s.debtorId)}
                                    </b>{' '}
                                    {s.debtorId === personId ? 'pay' : 'pays'}{' '}
                                    <b>
                                        {s.creditorId === personId
                                            ? 'you'
                                            : nameOf(s.creditorId)}
                                    </b>
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 16,
                                        fontWeight: 800,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                    {formatUsd(s.amount)}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 17,
                                        fontWeight: 700,
                                        color: '#9a9075',
                                    }}>
                                    ›
                                </Typography>
                            </Box>
                        )
                    })}
                </>
            )}
        </Box>
    )
}
