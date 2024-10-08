import { Box, Typography } from '@mui/material'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { FilterPaidBy, useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { FilterSpendType, useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import {
    FilterSplitBetween,
    useFilterSplitBetweenStore,
} from 'components/menu/filter/filter-split-between'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { SettingsMenu } from 'components/menu/settings/settings-menu'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { SortMenu, useSortMenuStore } from 'components/menu/sort/sort-menu'
import { getMenuItemBackgroundColor, getMenuItemIcon, getTablerIcon } from 'helpers/icons'
import { useGustavoStore } from 'views/gustavo'

export enum MenuItem {
    FilterPaidBy,
    FilterSpendType,
    FilterSplitBetween,
    Sort,
}

export type MenuItemData = {
    item: MenuItem
    component: JSX.Element
    state: any
    label: string
}

const menuItemStoreResets = new Set<() => void>()

const resetAllMenuItemStores = () => {
    menuItemStoreResets.forEach((reset) => reset())
}

export const Menu = () => {
    const { spendData, showLogs, setFilteredSpendData } = useGustavoStore(
        useShallow((state) => state)
    )

    // menu item states
    const filterPaidByState = useFilterPaidByStore(useShallow((state) => state))
    const filterSplitBetweenState = useFilterSplitBetweenStore(useShallow((state) => state))
    const filterSpendTypeState = useFilterSpendTypeStore(useShallow((state) => state))
    const sortMenuState = useSortMenuStore(useShallow((state) => state))

    // sort states
    const sortDateState = useSortDateStore(useShallow((state) => state))
    const sortItemNameState = useSortItemNameStore(useShallow((state) => state))
    const sortStates = [sortDateState, sortItemNameState]

    // define menu item properties, used for rendering
    const sortMenuItem = {
        item: MenuItem.Sort,
        component: <SortMenu />,
        state: sortMenuState,
        label: 'Sort',
    }

    const defaultMenuItems = [
        sortMenuItem,
        {
            item: MenuItem.FilterSplitBetween,
            component: <FilterSplitBetween />,
            label: 'Buyer',
            state: filterSplitBetweenState,
        },
        {
            item: MenuItem.FilterPaidBy,
            component: <FilterPaidBy />,
            label: 'Paid By',
            state: filterPaidByState,
        },
        {
            item: MenuItem.FilterSpendType,
            component: <FilterSpendType />,
            label: 'Type',
            state: filterSpendTypeState,
        },
    ]

    const [menuItems, setMenuItems] = useState<MenuItemData[]>(defaultMenuItems)
    const [expandedMenuItem, setExpandedMenuItem] = useState(-1)

    // when changing views, update the menu items accordingly
    useEffect(() => {
        setExpandedMenuItem(-1)
        if (!showLogs) {
            setMenuItems(menuItems.slice(1))
        } else {
            setMenuItems(defaultMenuItems)
        }
    }, [showLogs])

    // get all menu item state resets
    const menuItemStates = defaultMenuItems.map((item) => item.state)
    menuItemStates.forEach((state) => {
        menuItemStoreResets.add(state.reset)
    })

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

    // settings stores
    const { showIconLabels } = useSettingsIconLabelsStore()

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
                            paddingY: 2,
                            width: '100%',
                            borderTop: '1px solid #FBBC04',
                            borderTopRightRadius: '10px',
                            borderTopLeftRadius: '10px',
                            borderRight: '1px solid #FBBC04',
                            borderBottomWidth: 0,
                            borderLeft: '1px solid #FBBC04',
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
                            alignSelf: 'flex-end',
                            paddingY: 2,
                            borderTop: '1px solid #FBBC04',
                            borderTopRightRadius: '10px',
                            borderTopLeftRadius: '10px',
                            borderRight: '1px solid #FBBC04',
                            borderBottomWidth: 0,
                            borderLeft: '1px solid #FBBC04',
                            backgroundColor: 'white',
                        }}>
                        <SettingsMenu />
                    </Box>
                )}
                {/* Menu */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        borderTopRightRadius: expandedMenuItem === -1 && !showSettings ? '10px' : 0,
                        borderTopLeftRadius: expandedMenuItem === -1 ? '10px' : 0,
                        borderRight: '1px solid #FBBC04',
                        borderBottom: 'none',
                        borderLeft: '1px solid #FBBC04',
                        backgroundColor: 'white',
                    }}>
                    {/* Each menu item is wrapped in a box
                        The outside box has no right/left borders so the top border is continuous
                        The inside box controls right/left borders for when the menu item is expanded */}
                    {/* Menu item - Reset all */}
                    <Box
                        sx={{
                            display: 'flex',
                            width: '100%',
                            borderTop: '1px solid #FBBC04',
                            borderTopLeftRadius: expandedMenuItem === -1 ? '10px' : 0,
                            borderRightWidth: 0,
                            borderLeftWidth: 0,
                        }}
                        onClick={() => handleResetAllMenuItems()}>
                        {/* Inside box */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingY: 2,
                                width: '100%',
                                borderRight: '1px solid white',
                                borderLeft: '1px solid white',
                                borderTopLeftRadius: expandedMenuItem === -1 ? '10px' : 0,
                            }}>
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
                                    'transition': 'background-color 0.1s',
                                }}>
                                <ArrowClockwise size={24} />
                            </Box>
                            {showIconLabels && (
                                <Typography sx={{ fontSize: '12px' }}>Reset</Typography>
                            )}
                        </Box>
                    </Box>
                    {/* Menu items */}
                    {menuItems.map((item, index) => {
                        return (
                            <Box
                                key={'menu-item-' + index}
                                sx={{
                                    display: 'flex',
                                    width: '100%',
                                    borderTop:
                                        index === expandedMenuItem
                                            ? '1px solid white'
                                            : '1px solid #FBBC04',
                                    borderRightWidth: 0,
                                    borderLeftWidth: 0,
                                }}
                                onClick={() => {
                                    handleMenuItemClick(index)
                                }}>
                                {/* Inside box */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        paddingY: 2,
                                        width: '100%',
                                        borderRight:
                                            index === expandedMenuItem
                                                ? '1px solid #FBBC04'
                                                : '1px solid white',
                                        borderLeft:
                                            index === expandedMenuItem
                                                ? '1px solid #FBBC04'
                                                : '1px solid white',
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
                                            transition: 'background-color 0.1s',
                                        }}>
                                        {getMenuItemIcon(item.item)}
                                    </Box>
                                    {showIconLabels && (
                                        <Typography sx={{ fontSize: '12px' }}>
                                            {item.label}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        )
                    })}
                    <Box
                        sx={{
                            display: 'flex',
                            width: '100%',
                            borderTop: showSettings ? '1px solid white' : '1px solid #FBBC04',
                            borderTopRightRadius:
                                expandedMenuItem === -1 && !showSettings ? '10px' : 0,
                            borderRightWidth: 0,
                            borderLeftWidth: 0,
                        }}
                        onClick={() => handleSettingsClick()}>
                        {/* Inside box */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingY: 2,
                                width: '100%',
                                borderRight: '1px solid white',
                                borderTopRightRadius:
                                    expandedMenuItem === -1 && !showSettings ? '10px' : 0,
                                borderLeft: showSettings ? '1px solid #FBBC04' : '1px solid white',
                            }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: 26,
                                    height: 26,
                                    borderRadius: '100%',
                                    backgroundColor: showSettings ? '#FBBC04' : 'white',
                                    transition: 'background-color 0.1s',
                                }}>
                                {getTablerIcon({ name: 'IconSettings' })}
                            </Box>
                            {showIconLabels && (
                                <Typography sx={{ fontSize: '12px' }}>Settings</Typography>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
