import Box from '@mui/material/Box'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { resetAllSortStores } from 'components/menu/sort/sort-menu'
import { Spend } from 'helpers/spend'
import { defaultIconSize, getTablerIcon } from 'helpers/icons'

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
    isActive: () => boolean
    getSortOrderIcon: (size?: number) => JSX.Element | null | undefined
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
}))

export const SortDate = () => {
    const { order, toggleSortOrder, getSortOrderIcon } = useSortDateStore(
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
                {getTablerIcon({ name: 'IconCalendarEvent' })}
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
