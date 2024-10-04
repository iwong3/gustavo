import Box from '@mui/material/Box'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { Spend } from 'helpers/spend'
import { getTablerIcon } from 'icons/tabler-icons'
import { resetAllSortStores } from 'components/menu/sort/sort-menu'

enum SortOrder {
    None,
    Descending,
    Ascending,
}

type SortDateState = {
    order: SortOrder
}

type SortDateActions = {
    sort: (spendData: Spend[]) => Spend[]

    toggleSortOrder: () => void
    reset: () => void
}

const initialState: SortDateState = {
    order: SortOrder.None,
}

export const useSortDateStore = create<SortDateState & SortDateActions>()((set, get) => ({
    ...initialState,

    sort: (spendData: Spend[]): Spend[] => {
        const { order } = get()

        if (order === SortOrder.None) {
            return spendData
        }

        const sortedSpendData = spendData.slice().sort((a, b) => {
            const dateA = new Date(a.date)
            const dateB = new Date(b.date)

            if (order === SortOrder.Descending) {
                return dateB.getTime() - dateA.getTime()
            }
            return dateA.getTime() - dateB.getTime()
        })
        return sortedSpendData
    },

    toggleSortOrder: () => {
        const { order } = get()
        const currentOrder = order
        resetAllSortStores()
        set(() => ({ order: (currentOrder + 1) % (Object.keys(SortOrder).length / 2) }))
    },

    reset: () => set(initialState),
}))

export const SortDate = () => {
    const { order, toggleSortOrder } = useSortDateStore(useShallow((state) => state))
    const isActive = order !== SortOrder.None

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
            onClick={() => {
                toggleSortOrder()
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 26,
                    height: 26,
                    backgroundColor: isActive ? '#FBBC04' : 'white',
                    borderRadius: '100%',
                }}>
                {order === SortOrder.None && getTablerIcon('IconCalendarEvent')}
                {order === SortOrder.Descending && getTablerIcon('IconCalendarDown')}
                {order === SortOrder.Ascending && getTablerIcon('IconCalendarUp')}
            </Box>
        </Box>
    )
}
