import { Box, Typography } from '@mui/material'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { FilterLocation, useFilterLocationStore } from 'components/menu/filter/filter-location'
import { FilterPaidBy, useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { FilterSpendType, useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import {
    FilterSplitBetween,
    useFilterSplitBetweenStore,
} from 'components/menu/filter/filter-split-between'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { SettingsMenu } from 'components/menu/settings/settings-menu'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { SortMenu, useSortMenuStore } from 'components/menu/sort/sort-menu'
import { useToolsMenuStore } from 'components/menu/tools/tools-menu'
import {
    defaultIconSize,
    getMenuItemBackgroundColor,
    getMenuItemIcon,
    getTablerIcon,
} from 'helpers/icons'
import { useGustavoStore } from 'views/gustavo'

export enum MenuItem {
    FilterLocation,
    FilterPaidBy,
    FilterSpendType,
    FilterSplitBetween,
    Sort,
    Tools,
    ToolsDebtPerson1,
    ToolsDebtPerson2,
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
    const {
        spendData,
        setFilteredSpendData,
        setFilteredSpendDataWithoutSplitBetween,
        setFilteredSpendDataWithoutSpendType,
        setFilteredSpendDataWithoutLocation,
    } = useGustavoStore(useShallow((state) => state))
    const { activeItem: activeView } = useToolsMenuStore(useShallow((state) => state))

    // menu item states
    // filters
    const filterPaidByState = useFilterPaidByStore(useShallow((state) => state))
    const filterSplitBetweenState = useFilterSplitBetweenStore(useShallow((state) => state))
    const filterSpendTypeState = useFilterSpendTypeStore(useShallow((state) => state))
    const filterLocationState = useFilterLocationStore(useShallow((state) => state))
    const filterStates = [
        filterPaidByState,
        filterSplitBetweenState,
        filterSpendTypeState,
        filterLocationState,
    ]

    // sorts
    const sortMenuState = useSortMenuStore(useShallow((state) => state))
    const sortCostState = useSortCostStore(useShallow((state) => state))
    const sortDateState = useSortDateStore(useShallow((state) => state))
    const sortItemNameState = useSortItemNameStore(useShallow((state) => state))
    const sortStates = [sortCostState, sortDateState, sortItemNameState]

    // search
    const searchBarState = useSearchBarStore(useShallow((state) => state))

    // define menu item properties, used for rendering
    const filterMenuItems: MenuItemData[] = [
        {
            item: MenuItem.FilterSplitBetween,
            component: <FilterSplitBetween />,
            state: filterSplitBetweenState,
            label: 'Person',
        },
        {
            item: MenuItem.FilterPaidBy,
            component: <FilterPaidBy />,
            state: filterPaidByState,
            label: 'Paid By',
        },
        {
            item: MenuItem.FilterSpendType,
            component: <FilterSpendType />,
            state: filterSpendTypeState,
            label: 'Type',
        },
        {
            item: MenuItem.FilterLocation,
            component: <FilterLocation />,
            state: filterLocationState,
            label: 'Location',
        },
    ]

    const sortMenuItem: MenuItemData = {
        item: MenuItem.Sort,
        component: <SortMenu />,
        state: sortMenuState,
        label: 'Sort',
    }

    const menuItems = [sortMenuItem, ...filterMenuItems]

    // whenever any filter and sort state changes, update the filtered spend data
    useEffect(() => {
        // apply filters
        let filteredSpendData = spendData
        filteredSpendData = filterSplitBetweenState.filter(filteredSpendData)
        filteredSpendData = filterPaidByState.filter(filteredSpendData)
        filteredSpendData = filterSpendTypeState.filter(filteredSpendData)
        filteredSpendData = filterLocationState.filter(filteredSpendData)

        // apply sorting - only one sort will be active at a time
        for (const sortState of sortStates) {
            if (sortState.order !== 0) {
                filteredSpendData = sortState.sort(filteredSpendData)
                break
            }
        }

        // apply search
        filteredSpendData = searchBarState.search(filteredSpendData)

        // apply filters for partial filtered spend data
        // doesn't need sort or search as it's only used for calculating totals for graphs
        let filteredSpendDataWithoutSplitBetween = spendData
        filteredSpendDataWithoutSplitBetween = filterPaidByState.filter(
            filteredSpendDataWithoutSplitBetween
        )
        filteredSpendDataWithoutSplitBetween = filterSpendTypeState.filter(
            filteredSpendDataWithoutSplitBetween
        )
        filteredSpendDataWithoutSplitBetween = filterLocationState.filter(
            filteredSpendDataWithoutSplitBetween
        )

        let filteredSpendDataWithoutSpendType = spendData
        filteredSpendDataWithoutSpendType = filterSplitBetweenState.filter(
            filteredSpendDataWithoutSpendType
        )
        filteredSpendDataWithoutSpendType = filterPaidByState.filter(
            filteredSpendDataWithoutSpendType
        )
        filteredSpendDataWithoutSpendType = filterLocationState.filter(
            filteredSpendDataWithoutSpendType
        )

        let filteredSpendDataWithoutLocation = spendData
        filteredSpendDataWithoutLocation = filterSplitBetweenState.filter(
            filteredSpendDataWithoutLocation
        )
        filteredSpendDataWithoutLocation = filterPaidByState.filter(
            filteredSpendDataWithoutLocation
        )
        filteredSpendDataWithoutLocation = filterSpendTypeState.filter(
            filteredSpendDataWithoutLocation
        )

        setFilteredSpendData(filteredSpendData)
        setFilteredSpendDataWithoutSplitBetween(filteredSpendDataWithoutSplitBetween)
        setFilteredSpendDataWithoutSpendType(filteredSpendDataWithoutSpendType)
        setFilteredSpendDataWithoutLocation(filteredSpendDataWithoutLocation)
    }, [...filterStates, ...sortStates, searchBarState])

    // expanded menu item state
    const [expandedMenuItem, setExpandedMenuItem] = useState(-1)

    // when changing views, collapse the expanded menu item
    useEffect(() => {
        setExpandedMenuItem(-1)
    }, [activeView])

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

    const renderExpandedMenuItem = () => {
        if (expandedMenuItem !== -1) {
            return menuItems[expandedMenuItem].component
        }
    }

    // menu item resets
    const menuItemStates = menuItems.map((item) => item.state)
    menuItemStates.forEach((state) => {
        menuItemStoreResets.add(state.reset)
    })

    const handleResetAllMenuItems = () => {
        resetAllMenuItemStores()
        setExpandedMenuItem(-1)
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
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

    const menuLabelFontSize = 12

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                position: 'fixed',
                bottom: 0,
                fontSize: 14,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '90%',
                }}>
                {/* Active filter */}
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                        borderTop: expandedMenuItem !== -1 ? '1px solid #FBBC04' : 'none',
                        borderTopRightRadius: '10px',
                        borderTopLeftRadius: '10px',
                        borderRight: expandedMenuItem !== -1 ? '1px solid #FBBC04' : 'none',
                        borderLeft: expandedMenuItem !== -1 ? '1px solid #FBBC04' : 'none',
                        maxHeight: expandedMenuItem !== -1 ? 'auto' : 0,
                        opacity: expandedMenuItem !== -1 ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.05s ease-out, opacity 0.05s ease-in',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingY: 1,
                            width: '100%',
                            backgroundColor: 'white',
                        }}>
                        {renderExpandedMenuItem()}
                    </Box>
                </Box>
                {/* Show settings */}
                <Box
                    sx={{
                        display: 'flex',
                        alignSelf: 'flex-end',
                        borderTop: showSettings ? '1px solid #FBBC04' : 'none',
                        borderTopRightRadius: '10px',
                        borderTopLeftRadius: '10px',
                        borderRight: showSettings ? '1px solid #FBBC04' : 'none',
                        borderLeft: showSettings ? '1px solid #FBBC04' : 'none',
                        maxHeight: showSettings ? 'auto' : 0,
                        opacity: showSettings ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.05s ease-out, opacity 0.05s ease-in',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            paddingY: 2,
                            backgroundColor: 'white',
                        }}>
                        <SettingsMenu />
                    </Box>
                </Box>
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
                        borderBottom: '1px solid #FBBC04',
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
                        }}
                        onClick={() => handleResetAllMenuItems()}>
                        {/* Inside box */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingY: 1,
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
                                <ArrowClockwise size={defaultIconSize} />
                            </Box>
                            {showIconLabels && (
                                <Typography sx={{ fontSize: menuLabelFontSize }}>Reset</Typography>
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
                                        paddingY: 1,
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
                                        <Typography sx={{ fontSize: menuLabelFontSize }}>
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
                        }}
                        onClick={() => handleSettingsClick()}>
                        {/* Inside box */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingY: 1,
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
                                <Typography sx={{ fontSize: menuLabelFontSize }}>
                                    Settings
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
