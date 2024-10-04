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

import { FilterPaidBy, useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { FilterSpendType, useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import {
    FilterSplitBetween,
    useFilterSplitBetweenStore,
} from 'components/menu/filter/filter-split-between'
import { SortMenu, useSortMenuStore } from 'components/menu/sort/sort-menu'
import { useGustavoStore } from 'views/gustavo'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { useSortDateStore } from 'components/menu/sort/sort-date'

enum MenuItem {
    FilterPaidBy,
    FilterSpendType,
    FilterSplitBetween,
    Sort,
}

type MenuItemData = {
    item: MenuItem
    component: JSX.Element
    state: any
}

export const Menu = () => {
    // update filtered spend data
    const { spendData, setFilteredSpendData } = useGustavoStore(useShallow((state) => state))

    // get filters and sorts individually so we can control the order the data is filtered
    const filterPaidByState = useFilterPaidByStore(useShallow((state) => state))
    const filterSplitBetweenState = useFilterSplitBetweenStore(useShallow((state) => state))
    const filterSpendTypeState = useFilterSpendTypeStore(useShallow((state) => state))
    const sortMenuState = useSortMenuStore(useShallow((state) => state))
    const sortDateState = useSortDateStore(useShallow((state) => state))
    const sortItemNameState = useSortItemNameStore(useShallow((state) => state))

    // filter data, used for rendering
    const menuItems: MenuItemData[] = [
        {
            item: MenuItem.FilterPaidBy,
            component: <FilterPaidBy />,
            state: filterPaidByState,
        },
        {
            item: MenuItem.FilterSplitBetween,
            component: <FilterSplitBetween />,
            state: filterSplitBetweenState,
        },
        {
            item: MenuItem.FilterSpendType,
            component: <FilterSpendType />,
            state: filterSpendTypeState,
        },
        {
            item: MenuItem.Sort,
            component: <SortMenu />,
            state: sortMenuState,
        },
    ]

    const allFiltersState = menuItems.map((item) => item.state)
    allFiltersState.forEach((item) => {
        storeResets.add(item.reset)
    })

    // whenever any filter changes, update the filtered spend data
    useEffect(() => {
        let filteredSpendData = spendData

        filteredSpendData = filterPaidByState.filter(filteredSpendData)
        filteredSpendData = filterSplitBetweenState.filter(filteredSpendData)
        filteredSpendData = filterSpendTypeState.filter(filteredSpendData)

        // filteredSpendData = sortMenuState.sort(filteredSpendData)
        if (sortDateState.order !== 0) {
            filteredSpendData = sortDateState.sort(filteredSpendData)
        } else if (sortItemNameState.order !== 0) {
            filteredSpendData = sortItemNameState.sort(filteredSpendData)
        }

        setFilteredSpendData(filteredSpendData)
    }, [...allFiltersState, sortDateState, sortItemNameState])

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
            return menuItems[expandedFilter].component
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
                {/* Menu */}
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
                    {/* Menu item - Reset all */}
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
                    {/* Menu items */}
                    {menuItems.map((item, index) => {
                        return (
                            <Box
                                key={'menu-item-' + index}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    paddingY: 2,
                                    width: '100%',
                                    borderTop:
                                        index === expandedFilter
                                            ? '1px solid white'
                                            : '1px solid #FBBC04',
                                    borderRight:
                                        index === menuItems.length - 1
                                            ? '1px solid white'
                                            : index === expandedFilter
                                            ? '1px solid #FBBC04'
                                            : '1px solid white',
                                    borderLeft:
                                        index === expandedFilter
                                            ? '1px solid #FBBC04'
                                            : '1px solid white',
                                    borderTopRightRadius:
                                        index === menuItems.length - 1 && expandedFilter === -1
                                            ? '10px'
                                            : 0,
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
                                        backgroundColor: getMenuItemBackgroundColor(item),
                                    }}>
                                    {getMenuItemIcon(item.item)}
                                </Box>
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Box>
    )
}

const storeResets = new Set<() => void>()

const resetAllStores = () => {
    storeResets.forEach((reset) => reset())
}

const getMenuItemIcon = (item: MenuItem, size: number = 24) => {
    switch (item) {
        case MenuItem.FilterPaidBy:
            return <UserCirclePlus size={size} />
        case MenuItem.FilterSpendType:
            return <Tag size={size} />
        case MenuItem.FilterSplitBetween:
            return <UserCircleMinus size={size} />
        case MenuItem.Sort:
            return <FunnelSimple size={size} />
        default:
            return null
    }
}

const FilterMenuItems = [
    MenuItem.FilterPaidBy,
    MenuItem.FilterSpendType,
    MenuItem.FilterSplitBetween,
]

const getMenuItemBackgroundColor = (item: MenuItemData) => {
    if (FilterMenuItems.includes(item.item)) {
        if (item.state.isFilterActive()) {
            return '#FBBC04'
        }
    }
    return 'white'
}
