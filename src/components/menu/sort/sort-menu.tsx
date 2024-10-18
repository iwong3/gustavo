import { Box, Typography } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { SortDate, useSortDateStore } from 'components/menu/sort/sort-date'
import { SortItemName, useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { getTablerIcon } from 'helpers/icons'
import { SortCost, useSortCostStore } from 'components/menu/sort/sort-cost'

export enum SortItem {
    SortCost,
    SortDate,
    SortItemName,
}

type SortMenuItemData = {
    item: SortItem
    component: JSX.Element
    state: any
    label: string
}

type SortMenuState = {
    active: boolean
}

type SortMenuActions = {
    isActive: () => boolean

    setActive: (active: boolean) => void
    reset: () => void
}

const initialState: SortMenuState = {
    active: false,
}

export const useSortMenuStore = create<SortMenuState & SortMenuActions>((set, get) => ({
    ...initialState,

    isActive: () => {
        const { active } = get()
        return active
    },

    setActive: (active: boolean) => set({ active }),
    reset: () => {
        set(initialState)
        resetAllSortStores()
    },
}))

const sortStoreResets = new Set<() => void>()

export const resetAllSortStores = () => {
    sortStoreResets.forEach((reset) => reset())
}

export const SortMenu = () => {
    // sort states
    const { setActive } = useSortMenuStore(useShallow((state) => state))
    const sortCostState = useSortCostStore(useShallow((state) => state))
    const sortDateState = useSortDateStore(useShallow((state) => state))
    const sortItemNameState = useSortItemNameStore(useShallow((state) => state))

    // define sort menu item properties, used for rendering
    const sortMenuItems: SortMenuItemData[] = [
        {
            item: SortItem.SortDate,
            component: <SortDate />,
            state: sortDateState,
            label: 'Date',
        },
        {
            item: SortItem.SortDate,
            component: <SortCost />,
            state: sortCostState,
            label: 'Cost',
        },
        {
            item: SortItem.SortItemName,
            component: <SortItemName />,
            state: sortItemNameState,
            label: 'Item Name',
        },
    ]

    // get all sort state resets
    const sortStates = sortMenuItems.map((sortItem) => sortItem.state)
    sortStates.forEach((state) => {
        sortStoreResets.add(state.reset)
    })

    useEffect(() => {
        if (sortStates.some((state) => state.isActive())) {
            setActive(true)
        } else {
            setActive(false)
        }
    }, [...sortStates])

    // settings stores
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginX: 2,
                width: '100%',
                border: '1px solid white',
                borderBottomWidth: 0,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                <Box
                    sx={{
                        'display': 'flex',
                        'justifyContent': 'center',
                        'alignItems': 'center',
                        'borderRadius': '100%',
                        '&:active': {
                            backgroundColor: '#FBBC04',
                        },
                        'transition': 'background-color 0.1s',
                    }}
                    onClick={() => {
                        resetAllSortStores()
                    }}>
                    {getTablerIcon({ name: 'IconX' })}
                </Box>
                {showIconLabels && <Typography sx={{ fontSize: '10px' }}>Clear</Typography>}
            </Box>
            {sortMenuItems.map((sortItem, index) => {
                return (
                    <Box
                        key={'sort-menu-item-' + index}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            {sortItem.component}
                        </Box>
                        {showIconLabels && (
                            <Typography sx={{ fontSize: '10px' }}>{sortItem.label}</Typography>
                        )}
                    </Box>
                )
            })}
        </Box>
    )
}
