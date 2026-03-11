'use client'

import { Box, Typography } from '@mui/material'
import { IconAlertTriangle } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'

import type { Expense } from '@/lib/types'

const BOBA_COST = 6.50
const BOBA_EMOJI = '🧋'
const COST_BG = '#d4ddb6' // soft sage green (matches date group header)

interface DrawerCostSectionProps {
    expense: Expense
    costUsd: number
}

export const DrawerCostSection = ({ expense, costUsd }: DrawerCostSectionProps) => {
    const isForeignCurrency = expense.currency !== 'USD'
    const bobaCount = costUsd > 0 ? Math.round((costUsd / BOBA_COST) * 10) / 10 : 0
    const bobaLabel = bobaCount === 1 ? 'boba' : 'bobas'

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
            }}>
            {isForeignCurrency ? (
                /* Foreign currency: centered pair with arrow between */
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        gap: 2.5,
                    }}>
                    {/* Left: original cost + boba */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography
                            sx={{
                                fontSize: 22,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                color: colors.primaryBlack,
                            }}>
                            {FormattedMoney(expense.currency).format(expense.costOriginal)}
                        </Typography>
                        {bobaCount > 0 && (
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: 'text.secondary',
                                    fontStyle: 'italic',
                                    mt: 0.5,
                                }}>
                                That&apos;s {bobaCount} {bobaLabel}! {BOBA_EMOJI}
                            </Typography>
                        )}
                    </Box>

                    {/* Arrow */}
                    <Typography sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }}>→</Typography>

                    {/* Right: converted USD + rate */}
                    <Box sx={{ textAlign: 'center' }}>
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
                        {expense.exchangeRate && (
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                                1 USD = {expense.exchangeRate.toFixed(2)} {expense.currency}
                            </Typography>
                        )}
                    </Box>
                </Box>
            ) : (
                /* USD only: centered cost + boba */
                <Box sx={{ textAlign: 'center' }}>
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
                    {bobaCount > 0 && (
                        <Typography
                            sx={{
                                fontSize: 13,
                                color: 'text.secondary',
                                fontStyle: 'italic',
                                mt: 0.5,
                            }}>
                            That&apos;s {bobaCount} {bobaLabel}! {BOBA_EMOJI}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Conversion error warning */}
            {expense.conversionError && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        mt: 0.75,
                        p: 0.75,
                        backgroundColor: '#ffe8e5',
                        borderRadius: '4px',
                        border: `1px solid ${colors.primaryRed}`,
                    }}>
                    <IconAlertTriangle size={14} color={colors.primaryRed} />
                    <Typography sx={{ fontSize: 12, color: colors.primaryRed, fontWeight: 600 }}>
                        Could not convert to USD
                    </Typography>
                </Box>
            )}

            {/* Currency exchange details */}
            {expense.categorySlug === 'currency_exchange' && expense.localCurrencyReceived && (
                <Typography
                    sx={{
                        fontSize: 12,
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        mt: 0.5,
                    }}>
                    {FormattedMoney('USD').format(expense.costOriginal)}
                    {' → '}
                    {FormattedMoney(expense.currency, 0).format(expense.localCurrencyReceived)}
                    {' (rate: '}
                    {(expense.localCurrencyReceived / expense.costOriginal).toFixed(2)}
                    {')'}
                </Typography>
            )}
        </Box>
    )
}
