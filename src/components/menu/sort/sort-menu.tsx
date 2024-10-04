import Box from '@mui/material/Box'
import { useShallow } from 'zustand/react/shallow'

import { SortDate, useSortDateStore } from 'components/menu/sort/sort-date'
import { SortItemName, useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { useState } from 'react'
import { Spend } from 'helpers/spend'
import { create } from 'zustand'

enum SortItem {
    SortDate,
    SortItemName,
}

type SortMenuItemData = {
    item: SortItem
    component: JSX.Element
    state: any
}

type SortMenuState = {
    sortItems: SortMenuItemData[]
}

type SortMenuActions = {
    sort: (spendData: Spend[]) => Spend[]
    reset: () => void
}

const initialState: SortMenuState = {
    sortItems: [
        {
            item: SortItem.SortDate,
            component: <SortDate />,
            state: useSortDateStore.getState(),
        },
        {
            item: SortItem.SortItemName,
            component: <SortItemName />,
            state: useSortItemNameStore.getState(),
        },
    ],
}

export const useSortMenuStore = create<SortMenuState & SortMenuActions>((set, get) => ({
    ...initialState,

    sort: (spendData: Spend[]): Spend[] => {
        const { sortItems } = get()

        for (let i = 0; i < sortItems.length; i++) {
            if (sortItems[i].state.order !== 0) {
                return sortItems[i].state.sort(spendData)
            }
        }

        return spendData
    },

    reset: () => {
        useSortDateStore.getState().reset()
        useSortItemNameStore.getState().reset()
        set(initialState)
    },
}))

export const SortMenu = () => {
    const { sortItems } = useSortMenuStore(useShallow((state) => state))

    sortItems.forEach((sortItem) => {
        sortStoreResets.add(sortItem.state.reset)
    })

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-evenly',
                alignItems: 'center',
                width: '100%',
            }}>
            {sortItems.map((sortItem, index) => {
                return (
                    <Box
                        key={'sort-menu-item-' + index}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        {sortItem.component}
                    </Box>
                )
            })}
        </Box>
    )
}

const sortStoreResets = new Set<() => void>()

export const resetAllSortStores = () => {
    sortStoreResets.forEach((reset) => reset())
}
