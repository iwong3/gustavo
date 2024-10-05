import Box from '@mui/material/Box'
import { SortDate, useSortDateStore } from 'components/menu/sort/sort-date'
import { SortItemName, useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

enum SortItem {
    SortDate,
    SortItemName,
}

type SortMenuItemData = {
    item: SortItem
    component: JSX.Element
    state: any
}

type SortMenuActions = {
    reset: () => void
}

export const useSortMenuStore = create<SortMenuActions>((set, get) => ({
    reset: () => resetAllSortStores(),
}))

const sortStoreResets = new Set<() => void>()

export const resetAllSortStores = () => {
    sortStoreResets.forEach((reset) => reset())
}

export const SortMenu = () => {
    // sort states
    const sortDateState = useSortDateStore(useShallow((state) => state))
    const sortItemNameState = useSortItemNameStore(useShallow((state) => state))

    // define sort menu item properties, used for rendering
    const sortMenuItems: SortMenuItemData[] = [
        {
            item: SortItem.SortDate,
            component: <SortDate />,
            state: sortDateState,
        },
        {
            item: SortItem.SortItemName,
            component: <SortItemName />,
            state: sortItemNameState,
        },
    ]

    // get all sort state resets
    const sortStates = sortMenuItems.map((sortItem) => sortItem.state)
    sortStates.forEach((state) => {
        sortStoreResets.add(state.reset)
    })

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-evenly',
                alignItems: 'center',
                width: '100%',
            }}>
            {sortMenuItems.map((sortItem, index) => {
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
