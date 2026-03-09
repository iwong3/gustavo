'use client'

import { cardSx, colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { HandCoins } from '@phosphor-icons/react'
import Link from 'next/link'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { getTablerIcon, InitialsIcon } from 'utils/icons'

const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const mo = (d: Date) => d.toLocaleString('en-US', { month: 'short' })
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
        return `${mo(s)} ${s.getDate()} – ${e.getDate()}`
    }
    const fmt = (d: Date) => `${mo(d)} ${d.getDate()}`
    return `${fmt(s)} – ${fmt(e)}`
}

const tools = [
    {
        name: 'Expenses',
        path: 'expenses',
        icon: 'IconReceipt',
        bg: '#e8edca',
    },
    {
        name: 'Debts',
        path: 'debts',
        icon: 'HandCoins',
        bg: '#f5d4d2',
    },
    {
        name: 'Graphs',
        path: 'graphs',
        icon: 'IconChartBar',
        bg: '#d2e0ea',
    },
    {
        name: 'Links',
        path: 'links',
        icon: 'IconExternalLink',
        bg: '#e6d9cc',
    },
]

export default function TripHubPage() {
    const { trip } = useTripData()
    const { totalSpend, debtMap } = useSpendData()

    const formatUsd = (n: number) =>
        n.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })

    // Count total outstanding debts
    let totalDebts = 0
    debtMap.forEach((owes) => {
        owes.forEach((amount) => {
            if (amount > 0.01) totalDebts++
        })
    })

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                maxWidth: 450,
                paddingX: 4,
                paddingY: 2,
            }}>
            {/* Trip header */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: 3,
                }}>
                <Typography
                    sx={{
                        fontSize: 24,
                        fontFamily: 'var(--font-serif)',
                        textAlign: 'center',
                    }}>
                    {trip.name}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 13,
                        color: 'text.secondary',
                        marginBottom: 1.5,
                    }}>
                    {formatDateRange(trip.startDate, trip.endDate)}
                </Typography>

                {/* Participant avatars */}
                <Box sx={{ display: 'flex', marginBottom: 2 }}>
                    {trip.participants.map((p, i) => (
                        <InitialsIcon
                            key={p.id}
                            name={p.firstName}
                            initials={p.initials}
                            iconColor={p.iconColor}
                            sx={{
                                width: 32,
                                height: 32,
                                fontSize: 11,
                                marginLeft: i === 0 ? 0 : -0.5,
                                zIndex: trip.participants.length - i,
                                border: `1px solid ${colors.primaryBlack}`,
                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                            }}
                        />
                    ))}
                </Box>

                {/* Quick stats */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 3,
                        fontSize: 13,
                        color: 'text.secondary',
                    }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Box
                            sx={{
                                fontWeight: 700,
                                fontSize: 16,
                                color: colors.primaryBlack,
                            }}>
                            {formatUsd(totalSpend)}
                        </Box>
                        <Box>total spent</Box>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                        <Box
                            sx={{
                                fontWeight: 700,
                                fontSize: 16,
                                color: colors.primaryBlack,
                            }}>
                            {totalDebts}
                        </Box>
                        <Box>{totalDebts === 1 ? 'debt' : 'debts'}</Box>
                    </Box>
                </Box>
            </Box>

            {/* Tool list — full-width stacked rows */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    width: '100%',
                }}>
                {tools.map((tool) => (
                    <Box
                        key={tool.name}
                        component={Link}
                        href={`/gustavo/trips/${trip.slug}/${tool.path}`}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 2,
                            'padding': 2,
                            ...cardSx,
                            'textDecoration': 'none',
                            'color': colors.primaryBlack,
                            '&:active': {
                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                transform: 'translate(1px, 1px)',
                            },
                            'transition': 'box-shadow 0.1s, transform 0.1s',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                backgroundColor: tool.bg,
                                border: `1.5px solid ${colors.primaryBlack}`,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                flexShrink: 0,
                            }}>
                            {tool.icon === 'HandCoins' ? (
                                <HandCoins
                                    size={22}
                                    weight="regular"
                                    color={colors.primaryBlack}
                                />
                            ) : (
                                getTablerIcon({
                                    name: tool.icon,
                                    size: 22,
                                    stroke: 1.8,
                                    color: colors.primaryBlack,
                                    fill: 'none',
                                })
                            )}
                        </Box>
                        <Typography
                            sx={{
                                fontSize: 16,
                                fontWeight: 600,
                            }}>
                            {tool.name}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
