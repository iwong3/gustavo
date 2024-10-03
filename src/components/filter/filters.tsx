import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { FilterPaidBy, useFilterPaidByStore } from 'components/filter/filter-items/filter-paid-by'
import {
    FilterSpendType,
    useFilterSpendTypeStore,
} from 'components/filter/filter-items/filter-spend-type'
import { useGustavoStore } from 'views/gustavo'

export const Filters = () => {
    // update filtered spend data
    const { spendData, setFilteredSpendData } = useGustavoStore(useShallow((state) => state))

    const paidByFilterState = useFilterPaidByStore(useShallow((state) => state))
    const spendTypeFilterState = useFilterSpendTypeStore(useShallow((state) => state))
    const allFiltersState = [paidByFilterState, spendTypeFilterState]

    useEffect(() => {
        let filteredSpendData = spendData
        filteredSpendData = paidByFilterState.filterByPaidBy(filteredSpendData)
        filteredSpendData = spendTypeFilterState.filterBySpendType(filteredSpendData)
        setFilteredSpendData(filteredSpendData)
    }, [...allFiltersState])

    // filter menu logic
    const filters = [
        {
            name: 'Paid By',
            component: <FilterPaidBy />,
        },
        {
            name: 'Spend Type',
            component: <FilterSpendType />,
        },
    ]
    const [activeFilter, setActiveFilter] = useState(-1)

    const updateActiveFilter = (index: number) => {
        if (activeFilter === index) {
            setActiveFilter(-1)
        } else {
            setActiveFilter(index)
        }
    }

    const renderActiveFilter = () => {
        if (activeFilter !== -1) {
            return filters[activeFilter].component
        }
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
                {activeFilter !== -1 && (
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
                        {renderActiveFilter()}
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
                        borderTopLeftRadius: activeFilter === -1 ? '10px' : 0,
                        borderTopRightRadius: activeFilter === -1 ? '10px' : 0,
                        backgroundColor: 'white',
                    }}>
                    {/* Filter choices */}
                    {filters.map((filter, index) => {
                        return (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                    borderTop:
                                        index === activeFilter ? 'none' : '1px solid #FBBC04',
                                    borderRight:
                                        index === activeFilter && index === 0
                                            ? '1px solid #FBBC04'
                                            : 'none',
                                    borderLeft:
                                        index === activeFilter && index === filters.length - 1
                                            ? '1px solid #FBBC04'
                                            : 'none',
                                    fontWeight: index === activeFilter ? 'bold' : 'normal',
                                }}
                                onClick={() => {
                                    updateActiveFilter(index)
                                }}>
                                <Box
                                    key={'filter-' + index}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: 2,
                                        cursor: 'pointer',
                                    }}>
                                    {filter.name}
                                </Box>
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Box>
    )
}
