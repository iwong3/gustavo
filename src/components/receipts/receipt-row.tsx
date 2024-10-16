import { Box } from '@mui/material'
import Grid from '@mui/material/Grid2'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import AnimateHeight from 'react-animate-height'
import { useShallow } from 'zustand/react/shallow'

import { useCollapseAllStore } from 'components/menu/items/collapse-all'
import { useSettingsCostStore } from 'components/menu/settings/settings-cost'
import { SplitBetweenInitials } from 'components/receipts/receipt-items/split-between-initials'
import { CostDisplay, FormattedMoney } from 'helpers/currency'
import { getTablerIcon, InitialsIcon, SpendTypeIcon } from 'helpers/icons'
import { getSplitCost, Spend } from 'helpers/spend'
import { getUcUrlFromOpenUrl } from 'helpers/image'

interface IReceiptsRowProps {
    spend: Spend
}

export const ReceiptsRow = ({ spend }: IReceiptsRowProps) => {
    const [expanded, setExpanded] = useState(false)
    const [receiptImageExpanded, setReceiptImageExpanded] = useState(false)

    const { value } = useCollapseAllStore(useShallow((state) => state))

    useEffect(() => {
        setExpanded(false)
    }, [value])

    const { costDisplay } = useSettingsCostStore(useShallow((state) => state))

    return (
        <Box>
            <Grid
                container
                onClick={() => setExpanded(!expanded)}
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

            {/* Expanded row */}
            <AnimateHeight duration={100} height={expanded ? 'auto' : 0}>
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
                                fontSize: 14,
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
                                <Box>
                                    {FormattedMoney(spend.currency).format(spend.originalCost)}
                                </Box>
                                <Box sx={{ marginX: 1 }}>
                                    {getTablerIcon({ name: 'IconArrowsSplit2', size: 12 })}
                                </Box>
                                {FormattedMoney().format(
                                    getSplitCost(spend.convertedCost, spend.splitBetween)
                                )}
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    marginTop: 2,
                                    marginBottom: 1,
                                }}>
                                {/* Receipt Image */}
                                {spend.receiptImageUrl && (
                                    <Box
                                        sx={{
                                            marginBottom: 1,
                                        }}>
                                        <Box
                                            onClick={() =>
                                                setReceiptImageExpanded(!receiptImageExpanded)
                                            }
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontSize: 12,
                                                fontStyle: 'italic',
                                            }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    marginRight: 1,
                                                }}>
                                                {getTablerIcon({ name: 'IconPhoto', size: 14 })}
                                            </Box>
                                            {!receiptImageExpanded ? 'View Image' : 'Hide Image'}
                                        </Box>
                                        {receiptImageExpanded && (
                                            <AnimateHeight
                                                duration={100}
                                                height={receiptImageExpanded ? 'auto' : 0}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        marginTop: 1,
                                                    }}>
                                                    <img
                                                        src={getUcUrlFromOpenUrl(
                                                            spend.receiptImageUrl
                                                        )}
                                                        alt="Receipt"
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '200px',
                                                        }}
                                                    />
                                                </Box>
                                            </AnimateHeight>
                                        )}
                                    </Box>
                                )}
                                {/* Notes */}
                                {spend.notes && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: 12,
                                            marginBottom: 1,
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 1,
                                            }}>
                                            {getTablerIcon({ name: 'IconNotes', size: 14 })}
                                        </Box>
                                        {spend.notes}
                                    </Box>
                                )}
                                {/* Reported by */}
                                {spend.reportedBy && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: 12,
                                            fontStyle: 'italic',
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 1,
                                            }}>
                                            {getTablerIcon({ name: 'IconClock', size: 14 })}
                                        </Box>
                                        Submitted by {spend.reportedBy} at{' '}
                                        {dayjs(spend.reportedAt).format('M/D h:mm A')}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </AnimateHeight>
        </Box>
    )
}
