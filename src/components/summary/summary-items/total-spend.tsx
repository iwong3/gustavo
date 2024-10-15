import { Box, LinearProgress } from '@mui/material'
import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { FormattedMoney } from 'helpers/currency'
import { useEffect, useState } from 'react'
import { useGustavoStore } from 'views/gustavo'
import { useShallow } from 'zustand/react/shallow'

export const TotalSpend = () => {
    const { totalSpend, filteredTotalSpend, filteredPeopleTotalSpend } = useGustavoStore(
        useShallow((state) => state)
    )

    const [percentOfTotalSpend, setPercentOfTotalSpend] = useState(0)
    const [useFilteredTotalSpend, setUseFilteredTotalSpend] = useState(false)

    useEffect(() => {
        if (!useFilteredTotalSpend) {
            if (totalSpend === 0) {
                setPercentOfTotalSpend(0)
                return
            }
            const percent = (filteredPeopleTotalSpend / totalSpend) * 100
            setPercentOfTotalSpend(percent)
        } else {
            if (filteredTotalSpend === 0) {
                setPercentOfTotalSpend(0)
                return
            }
            const percent = (filteredPeopleTotalSpend / filteredTotalSpend) * 100
            setPercentOfTotalSpend(percent)
        }
    }, [totalSpend, filteredTotalSpend, filteredPeopleTotalSpend, useFilteredTotalSpend])

    const { filters: splitBetweenFilter } = useFilterSplitBetweenStore(useShallow((state) => state))
    const { filters: spendTypeFilter } = useFilterSpendTypeStore(useShallow((state) => state))
    const { filters: locationFilter } = useFilterLocationStore(useShallow((state) => state))
    const filters = [splitBetweenFilter, spendTypeFilter, locationFilter]

    const [totalSpendTitle, setTotalSpendTitle] = useState('Total Spend')

    useEffect(() => {
        let title = ''

        const splitters = Object.entries(splitBetweenFilter).filter(([_, isActive]) => isActive)
        if (splitters.length > 0) {
            title += splitters.map(([splitter]) => splitter).join(' & ')
            title += "'s"
        }

        title += ' Total '

        const spendTypes = Object.entries(spendTypeFilter).filter(([_, isActive]) => isActive)
        if (spendTypes.length > 0) {
            title += ' ' + spendTypes.map(([type]) => type).join(' & ')
        }

        title += ' Spend'

        const locations = Object.entries(locationFilter).filter(([_, isActive]) => isActive)
        if (locations.length > 0) {
            title += ' in ' + locations.map(([location]) => location).join(' & ')
        }

        setTotalSpendTitle(title)
    }, [...filters])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0.5,
                    fontSize: 12,
                    fontWeight: 500,
                }}>
                {totalSpendTitle}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '40%',
                        border: '1px solid #FBBC04',
                        borderRadius: '10px',
                        fontSize: 24,
                        fontWeight: 500,
                        backgroundColor: 'white',
                        boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                    }}>
                    {FormattedMoney().format(filteredPeopleTotalSpend)}
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '50%',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 14,
                            fontWeight: 500,
                        }}>
                        <Box>{percentOfTotalSpend.toFixed(0) + '%'}</Box>
                        <Box>
                            {FormattedMoney().format(
                                useFilteredTotalSpend ? filteredTotalSpend : totalSpend
                            )}
                        </Box>
                    </Box>
                    <LinearProgress
                        value={percentOfTotalSpend}
                        variant="determinate"
                        color="success"
                        sx={{
                            height: '25px',
                            zIndex: -1,
                        }}
                    />
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 12,
                                cursor: 'pointer',
                                color: 'rgba(0, 0, 0, 0.54)',
                            }}
                            onClick={() => setUseFilteredTotalSpend(!useFilteredTotalSpend)}>
                            {useFilteredTotalSpend ? 'Filtered Total' : 'Total'}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
