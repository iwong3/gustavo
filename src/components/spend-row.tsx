import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid2'
import { BowlFood, Train, House, Gift, CaretRight } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import React from 'react'

import { getInitials, Spend, SpendType, USDollar } from 'helpers/spend'

interface ISpendRowProps {
    spend: Spend
}

export const SpendRow = ({ spend }: ISpendRowProps) => {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <Box
            sx={{
                borderBottom: '1px solid gray',
                paddingY: 1,
            }}
            onClick={() => setExpanded(!expanded)}>
            <Grid container>
                <Grid size={1.5}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            height: '100%',
                            marginLeft: 1,
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
                <Grid size={7.5}>
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
                            height: '100%',
                            marginRight: 1,
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
                                fontSize: '14px',
                            }}>
                            {spend.paidBy}
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
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                height: '100%',
                                marginRight: 1,
                                marginBottom: 1,
                            }}>
                            <Box
                                sx={{
                                    display: 'flex',
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
                                                width: 24,
                                                height: 24,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                borderRadius: '50%',
                                                backgroundColor: 'lightgray',
                                                marginLeft: 1,
                                            }}>
                                            {getInitials(person)}
                                        </Box>
                                    )
                                })}
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
