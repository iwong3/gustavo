import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid2'
import { BowlFood, Train, House, Gift, CaretRight } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import React from 'react'

import { getInitials, getSplitCost, Spend, SpendType, USDollar } from 'helpers/spend'

/**
 * To-Do:
 * - Display:
 *   - Split Between
 *   - Split Cost
 *   - Original Cost (USD, YEN)
 * - Turn rows into cards
 * - Total spend summary
 * - Table filters (should apply to both table and summary)
 * - Table sorting
 * - Color
 * - Gus Fring icon
 */

interface ISpendRowProps {
    spend: Spend
}

export const SpendRow = ({ spend }: ISpendRowProps) => {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <Box
            sx={{
                borderBottom: '1px solid gray',
                paddingY: 2,
            }}
            onClick={() => setExpanded(!expanded)}>
            <Grid container>
                <Grid size={2}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            height: '100%',
                            marginLeft: 2,
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                borderRadius: '10%',
                                border: '1px solid gray',
                                p: 0.25,
                            }}>
                            {getIconFromSpendType(spend.type, 32)}
                        </Box>
                    </Box>
                </Grid>
                {/* Spend Row Top */}
                <Grid size={7}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            height: '100%',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}>
                            {spend.name}
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                fontSize: '14px',
                            }}>
                            {dayjs(spend.date).format('M/DD')}
                            {spend.location && ' • ' + spend.location}
                        </Box>
                    </Box>
                </Grid>
                {/* Spend Row Bottom */}
                <Grid size={3}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                            marginRight: 2,
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}>
                            {USDollar.format(spend.cost)}
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: 24,
                                height: 24,
                                marginLeft: 1,
                                fontSize: '14px',
                                borderRadius: '100%',
                                backgroundColor: 'lightgray',
                            }}>
                            {getInitials(spend.paidBy)}
                        </Box>
                    </Box>
                </Grid>
            </Grid>
            {expanded && (
                <Grid container>
                    <Grid size={12}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                marginTop: 1,
                                marginX: 2,
                            }}>
                            {/* Split Between */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    height: '24px',
                                }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                    }}>
                                    Split Between:
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        fontSize: '14px',
                                    }}>
                                    {spend.splitBetween.map((person, index) => {
                                        return (
                                            <Box
                                                key={'split-' + index}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    width: 24,
                                                    height: 24,
                                                    marginLeft: 1,
                                                    borderRadius: '100%',
                                                    backgroundColor: 'lightgray',
                                                }}>
                                                {getInitials(person)}
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </Box>
                            {/* Split Cost */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: '24px',
                                    fontSize: '14px',
                                }}>
                                {USDollar.format(getSplitCost(spend.cost, spend.splitBetween))} per
                                person
                            </Box>
                            {/* Type of Spend */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    height: '24px',
                                }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                    }}>
                                    Type:
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginLeft: 1,
                                        fontSize: '14px',
                                    }}>
                                    {spend.type}
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            )}
        </Box>
    )
}

const getIconFromSpendType = (type: SpendType, size: number) => {
    switch (type) {
        case SpendType.Attraction:
            return <BowlFood size={size} />
        case SpendType.Commute:
            return <Train size={size} />
        case SpendType.Food:
            return <BowlFood size={size} />
        case SpendType.Hotel:
            return <House size={size} />
        case SpendType.Souvenir:
            return <Gift size={size} />
        case SpendType.Other:
        default:
            return <CaretRight size={size} />
    }
}

const detailRows = ['Split Between', 'Split Cost', 'Type']
