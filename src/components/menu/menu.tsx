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
import { SettingsCost } from 'components/menu/settings/settings-cost'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { getTablerIcon } from 'icons/tabler-icons'
import { useGustavoStore } from 'views/gustavo'

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

const menuItemStoreResets = new Set<() => void>()

const resetAllMenuItemStores = () => {
    menuItemStoreResets.forEach((reset) => reset())
}

export const Menu = () => {
    const { spendData, setFilteredSpendData } = useGustavoStore(useShallow((state) => state))

    // menu item states
    const filterPaidByState = useFilterPaidByStore(useShallow((state) => state))
    const filterSplitBetweenState = useFilterSplitBetweenStore(useShallow((state) => state))
    const filterSpendTypeState = useFilterSpendTypeStore(useShallow((state) => state))
    const sortMenuState = useSortMenuStore(useShallow((state) => state))

    // define menu item properties, used for rendering
    const menuItems: MenuItemData[] = [
        {
            item: MenuItem.Sort,
            component: <SortMenu />,
            state: sortMenuState,
        },
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
    ]

    // get all menu item state resets
    const menuItemStates = menuItems.map((item) => item.state)
    menuItemStates.forEach((state) => {
        menuItemStoreResets.add(state.reset)
    })

    // sort states
    const sortDateState = useSortDateStore(useShallow((state) => state))
    const sortItemNameState = useSortItemNameStore(useShallow((state) => state))
    const sortStates = [sortDateState, sortItemNameState]

    // whenever any filter and sort state changes, update the filtered spend data
    useEffect(() => {
        let filteredSpendData = spendData

        // apply filters
        filteredSpendData = filterPaidByState.filter(filteredSpendData)
        filteredSpendData = filterSplitBetweenState.filter(filteredSpendData)
        filteredSpendData = filterSpendTypeState.filter(filteredSpendData)

        // apply sorting - only one sort will be active at a time
        for (const sortState of sortStates) {
            if (sortState.order !== 0) {
                filteredSpendData = sortState.sort(filteredSpendData)
                break
            }
        }

        setFilteredSpendData(filteredSpendData)
    }, [...menuItemStates, ...sortStates])

    // expanded menu item state
    const [expandedMenuItem, setExpandedMenuItem] = useState(-1)

    const handleMenuItemClick = (index: number) => {
        if (showSettings) {
            setShowSettings(false)
        }

        if (expandedMenuItem === index) {
            setExpandedMenuItem(-1)
        } else {
            setExpandedMenuItem(index)
        }
    }

    const handleResetAllMenuItems = () => {
        resetAllMenuItemStores()
        setExpandedMenuItem(-1)
    }

    const renderExpandedMenuItem = () => {
        if (expandedMenuItem !== -1) {
            return menuItems[expandedMenuItem].component
        }
    }

    // settings
    const [showSettings, setShowSettings] = useState(false)
    const handleSettingsClick = () => {
        if (expandedMenuItem !== -1) {
            setExpandedMenuItem(-1)
        }
        setShowSettings(!showSettings)
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
                }}>
                {/* Active filter */}
                {expandedMenuItem !== -1 && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: '-10px',
                            paddingY: 2,
                            width: '100%',
                            borderTop: '1px solid #FBBC04',
                            borderBottom: '1px solid white',
                            borderLeft: '1px solid #FBBC04',
                            borderRight: '1px solid #FBBC04',
                            borderTopLeftRadius: '10px',
                            borderTopRightRadius: '10px',
                            backgroundColor: 'white',
                        }}>
                        {renderExpandedMenuItem()}
                    </Box>
                )}
                {/* Show settings */}
                {showSettings && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            alignSelf: 'flex-end',
                            paddingY: 2,
                            backgroundColor: 'white',
                            borderTop: '1px solid #FBBC04',
                            borderBottom: '1px solid white',
                            borderLeft: '1px solid #FBBC04',
                            borderRight: '1px solid #FBBC04',
                            borderTopLeftRadius: '10px',
                            borderTopRightRadius: '10px',
                            marginTop: '-10px',
                        }}>
                        <SettingsCost />
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
                        borderTopLeftRadius: expandedMenuItem === -1 ? '10px' : 0,
                        borderTopRightRadius: expandedMenuItem === -1 && !showSettings ? '10px' : 0,
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
                            borderTopLeftRadius: expandedMenuItem === -1 ? '10px' : 0,
                        }}
                        onClick={() => handleResetAllMenuItems()}>
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
                                        index === expandedMenuItem
                                            ? '1px solid white'
                                            : '1px solid #FBBC04',
                                    borderRight:
                                        index === expandedMenuItem
                                            ? '1px solid #FBBC04'
                                            : '1px solid white',
                                    borderLeft:
                                        index === expandedMenuItem
                                            ? '1px solid #FBBC04'
                                            : '1px solid white',
                                    fontWeight: index === expandedMenuItem ? 'bold' : 'normal',
                                }}
                                onClick={() => {
                                    handleMenuItemClick(index)
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
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingY: 2,
                            width: '100%',
                            borderTop: showSettings ? '1px solid white' : '1px solid #FBBC04',
                            borderLeft: showSettings ? '1px solid #FBBC04' : '1px solid white',
                            borderTopRightRadius:
                                expandedMenuItem === -1 && !showSettings ? '10px' : 0,
                        }}
                        onClick={() => handleSettingsClick()}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '100%',
                                backgroundColor: showSettings ? '#FBBC04' : 'white',
                            }}>
                            {getTablerIcon('IconSettings')}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
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
