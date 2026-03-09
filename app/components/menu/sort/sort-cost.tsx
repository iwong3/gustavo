import type { JSX } from 'react'
import { Box } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { resetAllSortStores } from 'components/menu/sort/sort-menu'
import { defaultIconSize, getTablerIcon } from 'utils/icons'

export enum SortOrder {
    None,
    Descending,
    Ascending,
}

type SortCostState = {
    order: SortOrder
}

type SortCostActions = {
    toggleSortOrder: () => void
    isActive: () => boolean
    getSortOrderIcon: (size?: number) => JSX.Element | null | undefined
    reset: () => void
}

const initialState: SortCostState = {
    order: SortOrder.None,
}

export const useSortCostStore = create<SortCostState & SortCostActions>()(
    (set, get) => ({
        ...initialState,

        toggleSortOrder: () => {
            const { order } = get()
            const currentOrder = order
            resetAllSortStores()
            set(() => ({
                order: (currentOrder + 1) % (Object.keys(SortOrder).length / 2),
            }))
        },
        isActive: () => {
            const { order } = get()
            return order !== SortOrder.None
        },
        getSortOrderIcon: (size: number = defaultIconSize) => {
            const { order } = get()
            if (order === SortOrder.Descending) {
                return getTablerIcon({ name: 'IconCaretDown', size })
            }
            if (order === SortOrder.Ascending) {
                return getTablerIcon({ name: 'IconCaretUp', size })
            }
        },
        reset: () => set(initialState),
    })
)

export const SortCost = () => {
    const { order, toggleSortOrder, getSortOrderIcon } = useSortCostStore(
        useShallow((state) => state)
    )
    const isActive = order !== SortOrder.None

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: defaultIconSize * 2,
            }}
            onClick={() => {
                toggleSortOrder()
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '100%',
                    backgroundColor: isActive ? '#FBBC04' : 'white',
                    transition: 'background-color 0.1s',
                }}>
                {getTablerIcon({ name: 'IconCurrencyDollar' })}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                {getSortOrderIcon()}
            </Box>
        </Box>
    )
}
