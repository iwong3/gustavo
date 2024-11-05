import { Box, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import AnimateHeight from 'react-animate-height'
import { useShallow } from 'zustand/react/shallow'

import { useCollapseAllStore } from 'components/menu/items/collapse-all'
import { useSettingsCostStore } from 'components/menu/settings/settings-cost'
import { SplitBetweenInitials } from 'components/receipts/receipt-items/split-between-initials'
import { CostDisplay, FormattedMoney } from 'helpers/currency'
import { ErrorConvertingToUSD } from 'helpers/data-processing'
import { getTablerIcon, InitialsIcon, SpendTypeIcon } from 'helpers/icons'
import { getUcUrlFromOpenUrl } from 'helpers/image'
import { getSplitCost, Spend } from 'helpers/spend'
import { useTripsStore } from 'views/trips'

interface IReceiptsRowProps {
    spend: Spend
}

export const ReceiptsRow = ({ spend }: IReceiptsRowProps) => {
    const { currentTrip } = useTripsStore(useShallow((state) => state))

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
                <Grid
                    size={2}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
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
                                color: spend.error ? '#C1121F' : 'black',
                            }}>
                            {costDisplay === CostDisplay.Original
                                ? FormattedMoney(spend.currency, 0).format(
                                      spend.originalCost
                                  )
                                : FormattedMoney('USD', 0).format(
                                      spend.convertedCost
                                  )}
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '12px',
                            }}>
                            <InitialsIcon
                                person={spend.paidBy}
                                sx={{ width: 24, height: 24 }}
                            />
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            {/* Expanded row */}
            <AnimateHeight duration={100} height={expanded ? 'auto' : 0}>
                <Grid
                    container
                    sx={{
                        borderTop: spend.error
                            ? '1px solid #C1121F'
                            : '1px solid #FBBC04',
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
                                    {FormattedMoney(spend.currency).format(
                                        spend.originalCost
                                    )}
                                </Box>
                                <Box sx={{ marginX: 1 }}>
                                    {getTablerIcon({
                                        name: 'IconArrowsSplit2',
                                        size: 12,
                                    })}
                                </Box>
                                {spend.error ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}>
                                        {FormattedMoney(spend.currency).format(
                                            getSplitCost(
                                                spend.originalCost,
                                                spend.splitBetween,
                                                currentTrip
                                            )
                                        )}
                                        <Tooltip
                                            title={ErrorConvertingToUSD}
                                            enterTouchDelay={0}
                                            slotProps={{
                                                popper: {
                                                    modifiers: [
                                                        {
                                                            name: 'offset',
                                                            options: {
                                                                offset: [
                                                                    0, -12,
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                                tooltip: {
                                                    sx: {
                                                        padding: 1,
                                                        border: '1px solid #C1121F',
                                                        fontSize: 12,
                                                        color: 'black',
                                                        fontStyle: 'italic',
                                                        fontWeight: 600,
                                                        backgroundColor:
                                                            '#f4d35e',
                                                        boxShadow:
                                                            'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                                                    },
                                                },
                                            }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginLeft: 0.5,
                                                }}>
                                                {getTablerIcon({
                                                    name: 'IconExclamationCircle',
                                                    size: 20,
                                                    fill: '#FBBC04',
                                                })}
                                            </Box>
                                        </Tooltip>
                                    </Box>
                                ) : (
                                    FormattedMoney().format(
                                        getSplitCost(
                                            spend.convertedCost,
                                            spend.splitBetween,
                                            currentTrip
                                        )
                                    )
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
                                                setReceiptImageExpanded(
                                                    !receiptImageExpanded
                                                )
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
                                                {getTablerIcon({
                                                    name: 'IconPhoto',
                                                    size: 14,
                                                })}
                                            </Box>
                                            {!receiptImageExpanded
                                                ? 'View Image'
                                                : 'Hide Image'}
                                        </Box>
                                        {receiptImageExpanded && (
                                            <AnimateHeight
                                                duration={100}
                                                height={
                                                    receiptImageExpanded
                                                        ? 'auto'
                                                        : 0
                                                }>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
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
                                            {getTablerIcon({
                                                name: 'IconNotes',
                                                size: 14,
                                            })}
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
                                            {getTablerIcon({
                                                name: 'IconClock',
                                                size: 14,
                                            })}
                                        </Box>
                                        Submitted by {spend.reportedBy} at{' '}
                                        {dayjs(spend.reportedAt).format(
                                            'M/D h:mm A'
                                        )}
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
