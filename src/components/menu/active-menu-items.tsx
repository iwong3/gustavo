import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { CollapseAll } from 'components/menu/items/collapse-all'
import { MenuItem } from 'components/menu/menu'
import { SearchBar } from 'components/menu/search/search-bar'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { SortItem, useSortMenuStore } from 'components/menu/sort/sort-menu'
import {
    ToolsMenuItem,
    useToolsMenuStore,
} from 'components/menu/tools/tools-menu'
import { defaultBackgroundColor } from 'helpers/colors'
import {
    getColorForSpendType,
    getIconFromSpendType,
    getMenuItemIcon,
    getSortMenuItemIcon,
    InitialsIcon,
    LocationIcon,
} from 'helpers/icons'
import { Location } from 'helpers/location'
import { SpendType } from 'helpers/spend'

type ActiveMenuItemData = {
    item: MenuItem
    size: number
    state: any
}

export const ActiveMenuItems = () => {
    // filter menu item states
    const filterPaidByState = useFilterPaidByStore(useShallow((state) => state))
    const filterSplitBetweenState = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )
    const filterSpendTypeState = useFilterSpendTypeStore(
        useShallow((state) => state)
    )
    const filterLocationState = useFilterLocationStore(
        useShallow((state) => state)
    )

    // sort menu item states
    const sortMenuState = useSortMenuStore(useShallow((state) => state))
    const sortCostState = useSortCostStore(useShallow((state) => state))
    const sortDateState = useSortDateStore(useShallow((state) => state))
    const sortItemNameState = useSortItemNameStore(useShallow((state) => state))

    const activeMenuItems: ActiveMenuItemData[] = [
        {
            item: MenuItem.Sort,
            size: 20,
            state: sortMenuState,
        },
        {
            item: MenuItem.FilterSplitBetween,
            size: 20,
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

    const renderActiveMenuItems = () => {
        return (
            <Box
                sx={{
                    display: 'flex',
                    overflowX: 'scroll',
                    width: '100%',
                    height: 32,
                }}>
                {activeMenuItems
                    .filter((item) => item.state.isActive())
                    .map((item, index) => {
                        return renderActiveMenuItem(item, index)
                    })}
            </Box>
        )
    }

    const renderActiveMenuItem = (item: ActiveMenuItemData, index: number) => {
        if (item.state.isActive()) {
            return (
                <Box
                    key={'active-menu-item-' + index}
                    sx={{
                        display: 'flex',
                        marginLeft: index === 0 ? 0 : 0.5,
                        border: '1px solid #FBBC04',
                        borderRadius: '10px',
                        backgroundColor: defaultBackgroundColor,
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
                        {renderMenuItem(item.item)}
                    </Box>
                </Box>
            )
        }
    }

    const renderMenuItem = (item: MenuItem) => {
        switch (item) {
            case MenuItem.FilterSplitBetween:
                return renderActiveSplitBetween()
            case MenuItem.FilterPaidBy:
                return renderActivePaidBy()
            case MenuItem.FilterSpendType:
                return renderActiveSpendType()
            case MenuItem.FilterLocation:
                return renderActiveLocation()
            case MenuItem.Sort:
                return renderActiveSort()
            default:
        }
    }

    const renderActiveSplitBetween = () => {
        const activeFilterItems = Array.from(
            filterSplitBetweenState.filters.entries()
        ).filter(([_, isActive]) => isActive)

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
                                filterSplitBetweenState.handleFilterClick(
                                    person
                                )
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight:
                                    index === activeFilterItems.length - 1
                                        ? 0
                                        : 0.25,
                            }}>
                            <InitialsIcon
                                person={person}
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
        const activeFilterItems = Array.from(
            filterPaidByState.filters.entries()
        ).filter(([_, isActive]) => isActive)

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
                                filterPaidByState.handleFilterClick(person)
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight:
                                    index === activeFilterItems.length - 1
                                        ? 0
                                        : 0.25,
                            }}>
                            <InitialsIcon
                                person={person}
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
        const activeFilterItems = Object.entries(
            filterSpendTypeState.filters
        ).filter(([_, isActive]) => isActive)
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
                                filterSpendTypeState.handleFilterClick(
                                    spendType as SpendType
                                )
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight:
                                    index === activeFilterItems.length - 1
                                        ? 0
                                        : 0.25,
                                height: 20,
                                width: 20,
                                borderRadius: '100%',
                                backgroundColor: getColorForSpendType(
                                    spendType as SpendType
                                ),
                            }}>
                            {getIconFromSpendType(spendType as SpendType, 20)}
                        </Box>
                    )
                })}
            </Box>
        )
    }

    const renderActiveLocation = () => {
        const activeFilterItems = Object.entries(
            filterLocationState.filters
        ).filter(([_, isActive]) => isActive)
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
                                filterLocationState.handleFilterClick(
                                    location as Location
                                )
                            }}
                            sx={{
                                marginLeft: index === 0 ? 0 : 0.25,
                                marginRight:
                                    index === activeFilterItems.length - 1
                                        ? 0
                                        : 0.25,
                            }}>
                            <LocationIcon
                                location={location as Location}
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

    const renderActiveSort = () => {
        const sortItems = [
            {
                item: SortItem.SortCost,
                state: sortCostState,
            },
            {
                item: SortItem.SortDate,
                state: sortDateState,
            },
            {
                item: SortItem.SortItemName,
                state: sortItemNameState,
            },
        ]

        const activeSortItem: JSX.Element[] = []
        sortItems.some((sortItem) => {
            if (sortItem.state.isActive()) {
                activeSortItem.push(
                    <Box
                        onClick={() => {
                            sortItem.state.reset()
                        }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                        {getSortMenuItemIcon(sortItem.item, 20)}
                        {sortItem.state.getSortOrderIcon(20)}
                    </Box>
                )
                return true
            }
        })

        return activeSortItem
    }

    // get active tool to determine if we should show 'collapse all' button
    const { activeItem } = useToolsMenuStore(useShallow((state) => state))

    const collapseAllTools = [
        ToolsMenuItem.Receipts,
        ToolsMenuItem.DebtCalculator,
    ]
    const searchBarTools = [
        ToolsMenuItem.Receipts,
        ToolsMenuItem.DebtCalculator,
    ]

    const isSearchBarActive = searchBarTools.includes(activeItem)

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                marginX: 1,
                overflowX: 'scroll',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '78%',
                }}>
                {isSearchBarActive && <SearchBar />}
                <Box
                    sx={{
                        marginLeft: isSearchBarActive ? 1 : 0,
                        marginRight: 1,
                        overflowX: 'scroll',
                    }}>
                    {renderActiveMenuItems()}
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                }}>
                {collapseAllTools.includes(activeItem) && <CollapseAll />}
            </Box>
        </Box>
    )
}
