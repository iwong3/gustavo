import { Box } from '@mui/material'
import { create } from 'zustand'

import { resetAllSortStores } from 'components/menu/sort/sort-menu'
import { Spend } from 'helpers/spend'
import { defaultIconSize, getTablerIcon } from 'helpers/icons'

enum SortOrder {
    None,
    Ascending,
    Descending,
}

type SortItemNameState = {
    order: SortOrder
}

type SortItemNameActions = {
    sort: (spendData: Spend[]) => Spend[]
    isActive: () => boolean

    toggleSortOrder: () => void
    reset: () => void
}

const initialState: SortItemNameState = {
    order: SortOrder.None,
}

export const useSortItemNameStore = create<SortItemNameState & SortItemNameActions>()(
    (set, get) => ({
        ...initialState,

        sort: (spendData: Spend[]): Spend[] => {
            const { order } = get()

            if (order === SortOrder.None) {
                return spendData
            }

            const sortedSpendData = spendData.slice().sort((a, b) => {
                if (order === SortOrder.Ascending) {
                    return a.name.localeCompare(b.name)
                }
                return b.name.localeCompare(a.name)
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
    })
)

export const SortItemName = () => {
    const { order, toggleSortOrder } = useSortItemNameStore((state) => state)
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
                {getTablerIcon({ name: 'IconSortAZ' })}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                {order === SortOrder.Descending && getTablerIcon({ name: 'IconCaretUp' })}
                {order === SortOrder.Ascending && getTablerIcon({ name: 'IconCaretDown' })}
            </Box>
        </Box>
    )
}
