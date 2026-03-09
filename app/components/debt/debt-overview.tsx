import { Box, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { colors } from '@/lib/colors'
import { simplifyDebts, sortSettlements, computeNetBalances } from '@/lib/debt'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { SettlementCard } from 'components/debt/settlement-card'
import { PersonBalanceCard } from 'components/debt/person-balance-card'
import { BalanceChart } from 'components/debt/balance-chart'
import { DebtDetailDrawer } from 'components/debt/debt-detail-drawer'

import type { UserSummary } from '@/lib/types'
import type { Settlement } from '@/lib/debt'

export function DebtOverview() {
    const { debtMap, expenses, participants } = useSpendData()
    const { trip } = useTripData()
    const currentUserId = trip.currentUserId

    // Participant lookup
    const participantById = useMemo(() => {
        const map = new Map<number, UserSummary>()
        for (const p of participants) map.set(p.id, p)
        return map
    }, [participants])

    // Simplified settlements
    const settlements = useMemo(
        () => sortSettlements(
            simplifyDebts(debtMap, participants),
            currentUserId,
            participantById
        ),
        [debtMap, participants, currentUserId, participantById]
    )

    // Per-person net balances, sorted: most owed (green) to most owing (red)
    const sortedBalances = useMemo(() => {
        const balances = computeNetBalances(debtMap, participants)
        return balances.sort((a, b) => b.netBalance - a.netBalance)
    }, [debtMap, participants])

    // Drawer state
    const [drawerUserId, setDrawerUserId] = useState<number | null>(null)

    const handleSettlementTap = (settlement: Settlement) => {
        // Open drawer for the debtor (the person who needs to pay)
        setDrawerUserId(settlement.debtorId)
    }

    const handlePersonTap = (userId: number) => {
        setDrawerUserId(userId)
    }

    const allSettled = settlements.length === 0

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, paddingX: 1.5, paddingY: 1.5 }}>
            {/* Net balance chart (top visual) */}
            {!allSettled && (
                <Box>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 1,
                            color: colors.primaryBlack,
                        }}>
                        Net Balances
                    </Typography>
                    <BalanceChart
                        balances={sortedBalances}
                        participantById={participantById}
                        currentUserId={currentUserId}
                    />
                </Box>
            )}

            {/* Settlement Summary */}
            <Box>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 1,
                        color: colors.primaryBlack,
                    }}>
                    Settle Up
                </Typography>

                {allSettled ? (
                    <Box
                        sx={{
                            padding: 2,
                            textAlign: 'center',
                            backgroundColor: '#d4edda',
                            borderRadius: '4px',
                            border: `1px solid ${colors.primaryBlack}`,
                            boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                            Everyone is settled up!
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {settlements.map((s) => (
                            <SettlementCard
                                key={`${s.debtorId}-${s.creditorId}`}
                                settlement={s}
                                participantById={participantById}
                                currentUserId={currentUserId}
                                onTap={handleSettlementTap}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* Divider */}
            <Box sx={{ borderTop: `1px solid ${colors.primaryBlack}20`, marginY: 0.5 }} />

            {/* Per-person balances (bottom section) */}
            <Box>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 1,
                        color: colors.primaryBlack,
                    }}>
                    Balances
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sortedBalances.map((balance) => {
                        const participant = participantById.get(balance.userId)
                        if (!participant) return null
                        return (
                            <PersonBalanceCard
                                key={balance.userId}
                                balance={balance}
                                participant={participant}
                                currentUserId={currentUserId}
                                debtMap={debtMap}
                                participantById={participantById}
                                onTap={handlePersonTap}
                            />
                        )
                    })}
                </Box>
            </Box>

            {/* Detail drawer */}
            <DebtDetailDrawer
                open={drawerUserId != null}
                onClose={() => setDrawerUserId(null)}
                userId={drawerUserId}
                participants={participants}
                participantById={participantById}
                currentUserId={currentUserId}
                debtMap={debtMap}
                expenses={expenses}
            />
        </Box>
    )
}
