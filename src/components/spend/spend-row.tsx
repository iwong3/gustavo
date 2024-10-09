import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid2'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsCostStore } from 'components/menu/settings/settings-cost'
import { OriginalCost } from 'components/spend/spend-items/original-cost'
import { SplitBetweenInitials } from 'components/spend/spend-items/split-between-initials'
import { CostDisplay, FormattedMoney } from 'helpers/currency'
import { InitialsIcon, SpendTypeIcon } from 'helpers/icons'
import { getSplitCost, Spend } from 'helpers/spend'

interface ISpendRowProps {
    spend: Spend
}

export const SpendRow = ({ spend }: ISpendRowProps) => {
    const [expanded, setExpanded] = useState(false)

    const { costDisplay } = useSettingsCostStore(useShallow((state) => state))

    return (
        <Box onClick={() => setExpanded(!expanded)}>
            <Grid
                container
                sx={{
                    paddingY: 2,
                }}>
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
                            {dayjs(spend.date).format('M/D')}
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
                            {costDisplay === CostDisplay.Original
                                ? FormattedMoney(spend.currency, 0).format(spend.originalCost)
                                : FormattedMoney('USD', 0).format(spend.convertedCost)}
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

            <Box
                sx={{
                    maxHeight: expanded ? 'auto' : 0,
                    opacity: expanded ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.05s ease-out, opacity 0.1s ease-in',
                }}>
                <Grid
                    container
                    sx={{
                        borderTop: '1px solid #FBBC04',
                    }}>
                    <Grid size={12}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
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
                                    getSplitCost(spend.convertedCost, spend.splitBetween)
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
                                    Submitted by {spend.reportedBy}
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    )
}
