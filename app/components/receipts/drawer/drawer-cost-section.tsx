'use client'

import { Box, Typography } from '@mui/material'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useMemo } from 'react'

import { colors, hardShadow } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'

import type { Expense } from '@/lib/types'

const BOBA_COST = 6.5
const BOBA_EMOJI = '🧋'
const COST_BG = '#d4ddb6' // soft sage green (matches date group header)

const textCardSx = {
    display: 'inline-block',
    backgroundColor: colors.secondaryYellow,
    opacity: '90%',
    borderRadius: '4px',
    border: `1.5px solid ${colors.primaryGreen}`,
    boxShadow: `1.5px 1.5px 0px ${colors.primaryGreen}`,
} as const

/** Simple seeded PRNG (mulberry32) — deterministic layout per expense */
function seededRandom(seed: number) {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Generate boba positions with even spacing and varied rotations */
function generateBobaPositions(count: number, seed: number) {
    if (count <= 0) return []
    const rand = seededRandom(seed)

    // For ≤10 bobas, place in left/right side zones to avoid text in the center.
    // Split count between sides, distribute vertically within each zone.
    if (count <= 10) {
        const GOLDEN_ANGLE = 137.508
        const base = rand() * 360
        const positions: { left: number; top: number; rotate: number; size: number }[] = []
        const rightCount = Math.floor(count / 2)
        const leftCount = count - rightCount
        // Left zone: 2-35%, Right zone: 65-98%
        const zones = [
            { n: leftCount, minX: 2, maxX: 35 },
            { n: rightCount, minX: 65, maxX: 98 },
        ]
        for (const zone of zones) {
            if (zone.n === 0) continue
            // Grid within this zone, same logic as the full-card grid
            const zoneW = zone.maxX - zone.minX
            const zoneAspect = zoneW / 100 // zone is narrower than full card
            const zCols = Math.max(1, Math.round(Math.sqrt(zone.n * (zoneAspect * 2.5))))
            const zRows = Math.max(1, Math.ceil(zone.n / zCols))
            const cellH = 100 / zRows

            let zPlaced = 0
            for (let r = 0; r < zRows && zPlaced < zone.n; r++) {
                const remaining = zone.n - zPlaced
                const rowsLeft = zRows - r
                const itemsInRow = Math.ceil(remaining / rowsLeft)
                const rowCellW = zoneW / itemsInRow

                for (let c = 0; c < itemsInRow; c++) {
                    const jitterAmt = 0.3
                    const left = zone.minX + rowCellW * (c + 0.5) + rowCellW * (rand() - 0.5) * jitterAmt
                    const top = cellH * (r + 0.5) + cellH * (rand() - 0.5) * jitterAmt
                    const rotJitter = (rand() - 0.5) * 40
                    const rotate = (base + positions.length * GOLDEN_ANGLE + rotJitter) % 360
                    const size = 14 + rand() * 8
                    positions.push({ left, top, rotate, size })
                    zPlaced++
                }
            }
        }
        return positions
    }

    // Grid approach for 11+ bobas.
    // Cell-centered: each emoji sits in the middle of its grid cell.
    // Emojis near edges partially clip naturally due to their size.
    const aspect = 2.5
    const cols = Math.max(2, Math.round(Math.sqrt(count * aspect)))
    const rows = Math.max(2, Math.ceil(count / cols))
    const cellH = 100 / rows

    const GOLDEN_ANGLE = 137.508
    const baseRotation = rand() * 360

    const positions: {
        left: number
        top: number
        rotate: number
        size: number
    }[] = []
    let placed = 0
    for (let r = 0; r < rows && placed < count; r++) {
        const remaining = count - placed
        const rowsLeft = rows - r
        const itemsInRow = Math.ceil(remaining / rowsLeft)
        // Center partial rows: offset so items are centered in the full width
        const rowCellW = 100 / itemsInRow
        const stagger = r % 2 === 1 ? rowCellW * 0.25 : 0

        for (let c = 0; c < itemsInRow; c++) {
            const jitterAmt = 0.3
            const left = stagger + rowCellW * (c + 0.5) + rowCellW * (rand() - 0.5) * jitterAmt
            const top = cellH * (r + 0.5) + cellH * (rand() - 0.5) * jitterAmt
            const rotJitter = (rand() - 0.5) * 40
            const rotate = (baseRotation + placed * GOLDEN_ANGLE + rotJitter) % 360
            const size = 14 + rand() * 8
            positions.push({ left, top, rotate, size })
            placed++
        }
    }
    return positions
}

interface DrawerCostSectionProps {
    expense: Expense
    costUsd: number
}

export const DrawerCostSection = ({
    expense,
    costUsd,
}: DrawerCostSectionProps) => {
    const isForeignCurrency = expense.currency !== 'USD'
    const bobaCount =
        costUsd > 0 ? Math.round((costUsd / BOBA_COST) * 10) / 10 : 0
    const bobaLabel = bobaCount === 1 ? 'boba' : 'bobas'
    const wholeBobaCount = Math.min(100, Math.max(1, Math.floor(bobaCount)))

    const bobaPositions = useMemo(
        () => generateBobaPositions(wholeBobaCount, expense.id),
        [wholeBobaCount, expense.id]
    )

    return (
        <Box
            sx={{
                mx: 2.5,
                mb: 2,
                px: 2,
                py: 1.25,
                backgroundColor: COST_BG,
                borderRadius: '4px',
                ...hardShadow,
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center',
            }}>
            {/* Scattered boba emojis — full-bleed layer ignoring padding */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 0,
                }}>
                {bobaPositions.map((pos, i) => (
                    <Box
                        key={i}
                        component="span"
                        sx={{
                            position: 'absolute',
                            left: `${pos.left}%`,
                            top: `${pos.top}%`,
                            transform: `translate(-50%, -50%) rotate(${pos.rotate}deg)`,
                            fontSize: pos.size,
                            lineHeight: 1,
                            userSelect: 'none',
                        }}>
                        {BOBA_EMOJI}
                    </Box>
                ))}
            </Box>
            {isForeignCurrency ? (
                /* Foreign currency: centered pair with arrow between */
                <Box
                    sx={{
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        gap: 2.5,
                        position: 'relative',
                        zIndex: 1,
                    }}>
                    {/* Left: original cost + boba */}
                    <Box
                        sx={{
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                        }}>
                        <Box sx={{ ...textCardSx, px: 0.75, py: 0.25 }}>
                            <Typography
                                sx={{
                                    fontSize: 22,
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    color: colors.primaryBlack,
                                }}>
                                {FormattedMoney(expense.currency).format(
                                    expense.costOriginal
                                )}
                            </Typography>
                        </Box>
                        {bobaCount > 0 && (
                            <Box sx={{ ...textCardSx, px: 0.5, py: 0.25 }}>
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        color: 'text.secondary',
                                        fontStyle: 'italic',
                                    }}>
                                    That&apos;s {bobaCount} {bobaLabel}!
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Arrow */}
                    <Box sx={{ ...textCardSx, px: 0.5, py: 0.25, mt: 0.25 }}>
                        <Typography
                            sx={{
                                fontSize: 18,
                                color: 'text.secondary',
                            }}>
                            →
                        </Typography>
                    </Box>

                    {/* Right: converted USD + rate */}
                    <Box
                        sx={{
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                        }}>
                        <Box sx={{ ...textCardSx, px: 0.75, py: 0.25 }}>
                            <Typography
                                sx={{
                                    fontSize: 22,
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    color: expense.conversionError
                                        ? colors.primaryRed
                                        : colors.primaryBlack,
                                }}>
                                {FormattedMoney('USD').format(costUsd)}
                            </Typography>
                        </Box>
                        {expense.exchangeRate && (
                            <Box sx={{ ...textCardSx, px: 0.5, py: 0.25 }}>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        color: 'text.secondary',
                                    }}>
                                    1 USD = {expense.exchangeRate.toFixed(2)}{' '}
                                    {expense.currency}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            ) : (
                /* USD only: centered cost + boba */
                <Box
                    sx={{
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                    }}>
                    <Box
                        sx={{
                            ...textCardSx,
                            px: 1,
                            py: 0.25,
                        }}>
                        <Typography
                            sx={{
                                fontSize: 28,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                color: expense.conversionError
                                    ? colors.primaryRed
                                    : colors.primaryBlack,
                            }}>
                            {FormattedMoney('USD').format(costUsd)}
                        </Typography>
                    </Box>
                    {bobaCount > 0 && (
                        <Box
                            sx={{
                                ...textCardSx,
                                px: 0.75,
                                py: 0.25,
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    color: 'text.secondary',
                                    fontStyle: 'italic',
                                }}>
                                That&apos;s {bobaCount} {bobaLabel}!
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Conversion error warning */}
            {expense.conversionError && (
                <Box
                    sx={{
                        ...textCardSx,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        mt: 0.75,
                        px: 0.75,
                        py: 0.5,
                        position: 'relative',
                        zIndex: 1,
                    }}>
                    <IconAlertTriangle size={14} color={colors.primaryRed} />
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: colors.primaryRed,
                            fontWeight: 600,
                        }}>
                        Could not convert to USD
                    </Typography>
                </Box>
            )}

            {/* Currency exchange details */}
            {expense.categorySlug === 'currency_exchange' &&
                expense.localCurrencyReceived && (
                    <Box sx={{ ...textCardSx, display: 'inline-block', px: 0.75, py: 0.25, mt: 0.5, position: 'relative', zIndex: 1 }}>
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: 'text.secondary',
                            fontStyle: 'italic',
                        }}>
                        {FormattedMoney('USD').format(expense.costOriginal)}
                        {' → '}
                        {FormattedMoney(expense.currency, 0).format(
                            expense.localCurrencyReceived
                        )}
                        {' (rate: '}
                        {(
                            expense.localCurrencyReceived / expense.costOriginal
                        ).toFixed(2)}
                        {')'}
                    </Typography>
                    </Box>
                )}
        </Box>
    )
}
