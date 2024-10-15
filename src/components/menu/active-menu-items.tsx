import { Box } from '@mui/material'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import {
    getIconFromSpendType,
    getMenuItemIcon,
    getTablerIcon,
    InitialsIcon,
    LocationIcon,
} from 'helpers/icons'
import { MenuItem } from 'components/menu/menu'
import { Person } from 'helpers/person'
import { Location } from 'helpers/location'
import { SpendType } from 'helpers/spend'
import { CollapseAll } from 'components/menu/items/collapse-all'
import { ToolsMenuItem, useToolsMenuStore } from 'components/menu/tools/tools-menu'

type ActiveMenuItemData = {
    item: MenuItem
    size: number
    state: any
}

export const ActiveMenuItems = () => {
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

    const activeMenuItems: ActiveMenuItemData[] = [
        {
            item: MenuItem.FilterSplitBetween,
            size: 24,
            state: filterSplitBetweenState,
        },
        {
            item: MenuItem.FilterPaidBy,
            size: 20,
            state: filterPaidByState,
        },
        {
            item: MenuItem.FilterSpendType,
            size: 20,
            state: filterSpendTypeState,
        },
        {
            item: MenuItem.FilterLocation,
            size: 20,
            state: filterLocationState,
        },
    ]

    const [anyFilterActive, setAnyFilterActive] = useState(false)

    useEffect(() => {
        const anyActive = activeMenuItems.some((item) => item.state.isActive())
        setAnyFilterActive(anyActive)
    }, [...filterStates])

    const renderActiveMenuItem = (item: ActiveMenuItemData, index: number) => {
        if (item.state.isActive()) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        marginLeft: index === 0 ? 0 : 0.5,
                        border: '2px solid #FBBC04',
                        borderRadius: '10px',
                        backgroundColor: 'white',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 0.5,
                            borderRight: '1px solid #FBBC04',
                        }}>
                        {getMenuItemIcon(item.item, item.size)}
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0.5,
                            transition: 'width 1s',
                        }}>
                        {renderActiveMenuItems(item.item)}
                    </Box>
                </Box>
            )
        }
    }

    const renderActiveMenuItems = (item: MenuItem) => {
        switch (item) {
            case MenuItem.FilterSplitBetween:
                return renderActiveSplitBetween()
            case MenuItem.FilterPaidBy:
                return renderActivePaidBy()
            case MenuItem.FilterSpendType:
                return renderActiveSpendType()
            case MenuItem.FilterLocation:
                return renderActiveLocation()
            default:
        }
    }

    const renderActiveSplitBetween = () => {
        const activeFilterItems = Object.entries(filterSplitBetweenState.filters).filter(
            ([_, isActive]) => isActive
        )
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                }}>
                {activeFilterItems.map(([person], index) => {
                    return (
                        <Box
                            key={'active-split-between-' + index}
                            onClick={() => {
                                filterSplitBetweenState.handleFilterClick(person as Person)
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight: index === activeFilterItems.length - 1 ? 0 : 0.25,
                            }}>
                            <InitialsIcon
                                person={person as Person}
                                sx={{
                                    height: 20,
                                    width: 20,
                                    fontSize: 10,
                                }}
                            />
                        </Box>
                    )
                })}
            </Box>
        )
    }

    const renderActivePaidBy = () => {
        const activeFilterItems = Object.entries(filterPaidByState.filters).filter(
            ([_, isActive]) => isActive
        )
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                }}>
                {activeFilterItems.map(([person], index) => {
                    return (
                        <Box
                            key={'active-paid-by-' + index}
                            onClick={() => {
                                filterPaidByState.handleFilterClick(person as Person)
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight: index === activeFilterItems.length - 1 ? 0 : 0.25,
                            }}>
                            <InitialsIcon
                                person={person as Person}
                                sx={{
                                    height: 20,
                                    width: 20,
                                    fontSize: 10,
                                }}
                            />
                        </Box>
                    )
                })}
            </Box>
        )
    }

    const renderActiveSpendType = () => {
        const activeFilterItems = Object.entries(filterSpendTypeState.filters).filter(
            ([_, isActive]) => isActive
        )
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                }}>
                {activeFilterItems.map(([spendType], index) => {
                    return (
                        <Box
                            key={'active-spend-type-' + index}
                            onClick={() => {
                                filterSpendTypeState.handleFilterClick(spendType as SpendType)
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight: index === activeFilterItems.length - 1 ? 0 : 0.25,
                                height: 20,
                                width: 20,
                            }}>
                            {getIconFromSpendType(spendType as SpendType, 20)}
                        </Box>
                    )
                })}
            </Box>
        )
    }

    const renderActiveLocation = () => {
        const activeFilterItems = Object.entries(filterLocationState.filters).filter(
            ([_, isActive]) => isActive
        )
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                }}>
                {activeFilterItems.map(([location], index) => {
                    return (
                        <Box
                            key={'active-location-' + index}
                            onClick={() => {
                                filterLocationState.handleFilterClick(location as Location)
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight: index === activeFilterItems.length - 1 ? 0 : 0.25,
                            }}>
                            <LocationIcon
                                location={location as Location}
                                sx={{
                                    height: 20,
                                    width: 20,
                                    fontSize: 10,
                                    backgroundColor: '#FBBC04',
                                }}
                            />
                        </Box>
                    )
                })}
            </Box>
        )
    }

    // get active tool to determine if we should show 'collapse all' button
    const { activeItem } = useToolsMenuStore(useShallow((state) => state))
    const collapseAllTools = [ToolsMenuItem.Receipts, ToolsMenuItem.DebtCalculator]

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                marginX: 1,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    overflowX: 'scroll',
                }}>
                {anyFilterActive &&
                    activeMenuItems.map((item, index) => {
                        return renderActiveMenuItem(item, index)
                    })}
            </Box>
            {collapseAllTools.includes(activeItem) && <CollapseAll />}
        </Box>
    )
}
