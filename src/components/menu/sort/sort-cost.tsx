import { Box } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { resetAllSortStores } from 'components/menu/sort/sort-menu'
import { defaultIconSize, getTablerIcon } from 'helpers/icons'
import { Spend } from 'helpers/spend'

export enum SortOrder {
    None,
    Descending,
    Ascending,
}

type SortCostState = {
    order: SortOrder
}

type SortCostActions = {
    sort: (spendData: Spend[]) => Spend[]
    isActive: () => boolean

    toggleSortOrder: () => void
    reset: () => void
}

const initialState: SortCostState = {
    order: SortOrder.None,
}

export const useSortCostStore = create<SortCostState & SortCostActions>()((set, get) => ({
    ...initialState,

    sort: (spendData: Spend[]): Spend[] => {
        const { order } = get()

        if (order === SortOrder.None) {
            return spendData
        }

        const sortedSpendData = spendData.slice().sort((a, b) => {
            if (order === SortOrder.Descending) {
                return b.convertedCost - a.convertedCost
            }
            return a.convertedCost - b.convertedCost
        })
        return sortedSpendData
    },
    isActive: () => {
        const { order } = get()
        return order !== SortOrder.None
    },

    toggleSortOrder: () => {
        const { order } = get()
        const currentOrder = order
        resetAllSortStores()
        set(() => ({ order: (currentOrder + 1) % (Object.keys(SortOrder).length / 2) }))
    },

    reset: () => set(initialState),
}))

export const SortCost = () => {
    const { order, toggleSortOrder } = useSortCostStore(useShallow((state) => state))
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
                {order === SortOrder.Descending && getTablerIcon({ name: 'IconCaretDown' })}
                {order === SortOrder.Ascending && getTablerIcon({ name: 'IconCaretUp' })}
            </Box>
        </Box>
    )
}
