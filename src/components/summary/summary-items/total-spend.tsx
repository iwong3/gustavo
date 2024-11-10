import { Box, LinearProgress } from '@mui/material'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { defaultBackgroundColor } from 'helpers/colors'
import { FormattedMoney } from 'helpers/currency'
import { useGustavoStore } from 'views/gustavo'

export const TotalSpend = () => {
    const { totalSpend, filteredTotalSpend, filteredPeopleTotalSpend } =
        useGustavoStore(useShallow((state) => state))

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
            const percent =
                (filteredPeopleTotalSpend / filteredTotalSpend) * 100
            setPercentOfTotalSpend(percent)
        }
    }, [
        totalSpend,
        filteredTotalSpend,
        filteredPeopleTotalSpend,
        useFilteredTotalSpend,
    ])

    const { filters: splitBetweenFilter } = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )
    const { filters: spendTypeFilter } = useFilterSpendTypeStore(
        useShallow((state) => state)
    )
    const { filters: locationFilter } = useFilterLocationStore(
        useShallow((state) => state)
    )
    const { filters: paidByFilter } = useFilterPaidByStore(
        useShallow((state) => state)
    )
    const filters = [
        splitBetweenFilter,
        spendTypeFilter,
        locationFilter,
        paidByFilter,
    ]

    const [splittersTitle, setSplittersTitle] = useState("Everyone's")
    const [totalSpendTitle, setTotalSpendTitle] = useState('Total Spend')

    useEffect(() => {
        let splittersTitle = "Everyone's"
        const splitters = Array.from(splitBetweenFilter.entries()).filter(
            ([_, isActive]) => isActive
        )
        if (splitters.length > 0) {
            splittersTitle = ''
            splittersTitle += splitters
                .map(([splitter]) => splitter)
                .join(' & ')
            splittersTitle += "'s"
        }

        let spendTitle = 'Total '

        const spendTypes = Object.entries(spendTypeFilter).filter(
            ([_, isActive]) => isActive
        )
        if (spendTypes.length > 0) {
            spendTitle += ' ' + spendTypes.map(([type]) => type).join(', ')
        }

        spendTitle += ' Spend'

        const locations = Array.from(locationFilter.entries()).filter(
            ([_, isActive]) => isActive
        )
        if (locations.length > 0) {
            spendTitle +=
                ' in ' + locations.map(([location]) => location).join(', ')
        }

        const paidBys = Array.from(paidByFilter.entries()).filter(
            ([_, isActive]) => isActive
        )
        if (paidBys.length > 0) {
            spendTitle +=
                ' Covered by ' + paidBys.map(([paidBy]) => paidBy).join(', ')
        }

        setSplittersTitle(splittersTitle)
        setTotalSpendTitle(spendTitle)
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
                    flexDirection: 'column',
                    justifyContent: 'center',
                    paddingX: 0.5,
                    fontSize: 12,
                    fontWeight: 500,
                }}>
                {splittersTitle && <Box>{splittersTitle}&nbsp;</Box>}
                <Box
                    sx={{
                        color: useFilteredTotalSpend ? '#c1121f' : 'black',
                    }}>
                    {totalSpendTitle}
                </Box>
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
                        backgroundColor: defaultBackgroundColor,
                        boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                    }}>
                    {FormattedMoney().format(filteredPeopleTotalSpend)}
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '52.5%',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            fontSize: 14,
                            fontWeight: 500,
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: 12,
                                color: useFilteredTotalSpend
                                    ? '#c1121f'
                                    : 'black',
                                cursor: 'pointer',
                            }}
                            onClick={() =>
                                setUseFilteredTotalSpend(!useFilteredTotalSpend)
                            }>
                            {useFilteredTotalSpend ? 'Filtered Total' : 'Total'}
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            color: '#5fad56', // linear progress bar color
                        }}>
                        <LinearProgress
                            value={percentOfTotalSpend}
                            variant="determinate"
                            color="inherit"
                            sx={{
                                height: '25px',
                                zIndex: -1,
                            }}
                        />
                    </Box>
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
                                useFilteredTotalSpend
                                    ? filteredTotalSpend
                                    : totalSpend
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
