import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid2'
import dayjs from 'dayjs'
import React from 'react'

import { FormattedMoney, getInitials, getSplitCost, Spend, USDollar } from 'helpers/spend'
import { SpendTypeIcon } from 'components/spend-items/spend-type-icon'
import { SplitBetweenInitials } from 'components/spend-items/split-between-initials'
import { OriginalCost } from 'components/spend-items/original-cost'
import { Typography } from '@mui/material'
import { InitialsIcon } from 'components/spend-items/initials-icon'

/**
 * To-Do:
 * - Display:
 *   - Split Between
 *   - Split Cost
 *   - Original Cost (USD, YEN)
 * - Total spend summary
 *   - View selector at top right
 * - Table filters (should apply to both table and summary)
 *   - Need to apply all filters sequentially
 * - Table sorting
 * - Color, color person initials
 * - Gus Fring quote? "A man provides... spend data."
 * - Toggle to show USD/YEN
 *
 * Ideas
 * - Put initials on left?
 */

interface ISpendRowProps {
    spend: Spend
}

export const SpendRow = ({ spend }: ISpendRowProps) => {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <Box
            sx={{
                paddingTop: 2,
                paddingBottom: expanded ? 0 : 2,
            }}
            onClick={() => setExpanded(!expanded)}>
            <Grid container>
                <Grid size={2}>
                    <SpendTypeIcon spend={spend} />
                </Grid>
                <Grid size={7}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            height: '100%',
                            fontSize: '14px',
                        }}>
                        {/* Spend Row Top */}
                        <Box
                            sx={{
                                display: 'flex',
                                fontWeight: 'bold',
                            }}>
                            {spend.name}
                        </Box>
                        {/* Spend Row Bottom */}
                        <Box
                            sx={{
                                display: 'flex',
                            }}>
                            {dayjs(spend.date).format('M/DD')}
                            {spend.location && ' • ' + spend.location}
                        </Box>
                    </Box>
                </Grid>
                <Grid size={3}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                            marginRight: 2,
                            fontSize: '14px',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                fontWeight: 'bold',
                            }}>
                            {USDollar.format(spend.cost)}
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '12px',
                            }}>
                            <InitialsIcon person={spend.paidBy} />
                        </Box>
                    </Box>
                </Grid>
            </Grid>
            {expanded && (
                <Grid
                    container
                    sx={{
                        marginTop: 2,
                        borderTop: '1px solid #FBBC04',
                    }}>
                    <Grid size={12}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                marginTop: 1,
                                marginX: 2,
                                fontSize: '14px',
                            }}>
                            {/* Split Between */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    width: '100%',
                                    marginY: 1,
                                    // height: '24px',
                                }}>
                                <SplitBetweenInitials spend={spend} />
                            </Box>
                            {/* Split Cost */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                }}>
                                <OriginalCost spend={spend} />
                                &nbsp;→&nbsp;
                                {FormattedMoney().format(
                                    getSplitCost(spend.cost, spend.splitBetween)
                                )}{' '}
                                each
                            </Box>
                            {/* Reported by */}
                            {spend.reportedBy && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        width: '100%',
                                        marginY: 1,
                                        fontSize: '12px',
                                        fontStyle: 'italic',
                                    }}>
                                    Reported by {spend.reportedBy}
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            )}
        </Box>
    )
}
