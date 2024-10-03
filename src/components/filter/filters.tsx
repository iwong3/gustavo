import Box from '@mui/material/Box'
import {
    ArrowClockwise,
    FunnelSimple,
    Tag,
    UserCircleMinus,
    UserCirclePlus,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { FilterPaidBy, useFilterPaidByStore } from 'components/filter/filter-items/filter-paid-by'
import {
    FilterSpendType,
    useFilterSpendTypeStore,
} from 'components/filter/filter-items/filter-spend-type'
import {
    FilterSplitBetween,
    useFilterSplitBetweenStore,
} from 'components/filter/filter-items/filter-split-between'
import { Columns } from 'helpers/spend'
import { useGustavoStore } from 'views/gustavo'

export const storeResets = new Set<() => void>()

const resetAllStores = () => {
    storeResets.forEach((reset) => reset())
}

export const Filters = () => {
    // update filtered spend data
    const { spendData, setFilteredSpendData } = useGustavoStore(useShallow((state) => state))

    // get filters individually so we can control the order the filters are applied
    const paidByFilterState = useFilterPaidByStore(useShallow((state) => state))
    const splitBetweenFilterState = useFilterSplitBetweenStore(useShallow((state) => state))
    const spendTypeFilterState = useFilterSpendTypeStore(useShallow((state) => state))

    // filter data, used for rendering
    const filters = [
        {
            column: Columns.PaidBy,
            component: <FilterPaidBy />,
            state: paidByFilterState,
        },
        {
            column: Columns.SplitBetween,
            component: <FilterSplitBetween />,
            state: splitBetweenFilterState,
        },
        {
            column: Columns.SpendType,
            component: <FilterSpendType />,
            state: spendTypeFilterState,
        },
    ]

    const allFiltersState = filters.map((filter) => filter.state)
    allFiltersState.forEach((filter) => {
        storeResets.add(filter.reset)
    })

    // whenever any filter changes, update the filtered spend data
    useEffect(() => {
        let filteredSpendData = spendData

        filteredSpendData = paidByFilterState.filterByPaidBy(filteredSpendData)
        filteredSpendData = splitBetweenFilterState.filterBySplitBetween(filteredSpendData)
        filteredSpendData = spendTypeFilterState.filterBySpendType(filteredSpendData)

        setFilteredSpendData(filteredSpendData)
    }, [...allFiltersState])

    // expanded filter state
    const [expandedFilter, setExpandedFilter] = useState(-1)

    const updateExpandedFilter = (index: number) => {
        if (expandedFilter === index) {
            setExpandedFilter(-1)
        } else {
            setExpandedFilter(index)
        }
    }

    const renderExpandedFilter = () => {
        if (expandedFilter !== -1) {
            return filters[expandedFilter].component
        }
    }

    const handleResetAllFilters = () => {
        resetAllStores()
        setExpandedFilter(-1)
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                position: 'fixed',
                bottom: 0,
                fontSize: '14px',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '90%',
                    boxShadow: '0px 40px 50px 0px rgba(0,0,0,1)',
                }}>
                {/* Active filter */}
                {expandedFilter !== -1 && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingY: 2,
                            width: '100%',
                            backgroundColor: 'white',
                            borderTop: '1px solid #FBBC04',
                            borderBottom: '1px solid white',
                            borderLeft: '1px solid #FBBC04',
                            borderRight: '1px solid #FBBC04',
                            borderTopLeftRadius: '10px',
                            borderTopRightRadius: '10px',
                            marginTop: '-10px',
                        }}>
                        {renderExpandedFilter()}
                    </Box>
                )}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        borderBottom: 'none',
                        borderLeft: '1px solid #FBBC04',
                        borderRight: '1px solid #FBBC04',
                        borderTopLeftRadius: expandedFilter === -1 ? '10px' : 0,
                        borderTopRightRadius: expandedFilter === -1 ? '10px' : 0,
                        backgroundColor: 'white',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingY: 2,
                            width: '100%',
                            borderTop: '1px solid #FBBC04',
                            borderTopLeftRadius: expandedFilter === -1 ? '10px' : 0,
                        }}
                        onClick={() => handleResetAllFilters()}>
                        <Box
                            sx={{
                                'display': 'flex',
                                'justifyContent': 'center',
                                'alignItems': 'center',
                                'width': 26,
                                'height': 26,
                                'borderRadius': '100%',
                                '&:active': {
                                    backgroundColor: '#FBBC04',
                                },
                            }}>
                            <ArrowClockwise size={24} />
                        </Box>
                    </Box>
                    {/* Filter choices */}
                    {filters.map((filter, index) => {
                        return (
                            <Box
                                key={'filter-' + index}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    paddingY: 2,
                                    width: '100%',
                                    borderTop:
                                        index === expandedFilter ? 'none' : '1px solid #FBBC04',
                                    borderRight:
                                        index === expandedFilter ? '1px solid #FBBC04' : 'none',
                                    borderLeft:
                                        index === expandedFilter ? '1px solid #FBBC04' : 'none',
                                    fontWeight: index === expandedFilter ? 'bold' : 'normal',
                                }}
                                onClick={() => {
                                    updateExpandedFilter(index)
                                }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        width: 26,
                                        height: 26,
                                        borderRadius: '100%',
                                        backgroundColor: filters[index].state.isFilterActive()
                                            ? '#FBBC04'
                                            : 'white',
                                    }}>
                                    {getIconFromColumnFilter(filter.column)}
                                </Box>
                            </Box>
                        )
                    })}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingY: 2,
                            width: '100%',
                            borderTop: '1px solid #FBBC04',
                            borderTopRightRadius: expandedFilter === -1 ? '10px' : 0,
                        }}
                        onClick={() => handleResetAllFilters()}>
                        <Box
                            sx={{
                                'display': 'flex',
                                'justifyContent': 'center',
                                'alignItems': 'center',
                                'width': 26,
                                'height': 26,
                                'borderRadius': '100%',
                                '&:active': {
                                    backgroundColor: '#FBBC04',
                                },
                            }}>
                            <FunnelSimple size={24} />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

const getIconFromColumnFilter = (column: Columns, size: number = 24) => {
    switch (column) {
        case Columns.PaidBy:
            return <UserCirclePlus size={size} />
        case Columns.SpendType:
            return <Tag size={size} />
        case Columns.SplitBetween:
            return <UserCircleMinus size={size} />
        default:
            return null
    }
}
