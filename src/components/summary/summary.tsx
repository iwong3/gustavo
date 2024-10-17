import { Box } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { MenuItem } from 'components/menu/menu'
import { TotalSpend } from 'components/summary/summary-items/total-spend'
import { TotalSpendByLocation } from 'components/summary/summary-items/total-spend-by-location'
import { TotalSpendByPerson } from 'components/summary/summary-items/total-spend-by-person'
import { TotalSpendByType } from 'components/summary/summary-items/total-spend-by-type'

export enum SummaryView {
    TotalSpendByPerson = 'TotalSpendByPerson',
    TotalSpendByType = 'TotalSpendByType',
    TotalSpendByLocation = 'TotalSpendByLocation',
}

type SummaryViewData = {
    view: SummaryView
    component: JSX.Element
    menuItem: MenuItem
    label: string
}

type SummaryState = {
    activeView: SummaryView
    activeComponent: JSX.Element
}

type SummaryActions = {
    setActiveView: (view: SummaryView) => void
    setActiveComponent: (component: JSX.Element) => void
}

const initialState: SummaryState = {
    activeView: SummaryView.TotalSpendByPerson,
    activeComponent: <TotalSpendByPerson />,
}

export const useSummaryStore = create<SummaryState & SummaryActions>((set) => ({
    ...initialState,

    setActiveView: (view: SummaryView) => {
        set(() => ({
            activeView: view,
        }))
    },
    setActiveComponent: (component: JSX.Element) => {
        set(() => ({
            activeComponent: component,
        }))
    },
}))

export const Summary = () => {
    const { activeView, activeComponent, setActiveComponent } = useSummaryStore(
        useShallow((state) => state)
    )

    const SummaryViews: SummaryViewData[] = [
        {
            view: SummaryView.TotalSpendByPerson,
            component: <TotalSpendByPerson />,
            menuItem: MenuItem.FilterSplitBetween,
            label: 'By Person',
        },
        {
            view: SummaryView.TotalSpendByType,
            component: <TotalSpendByType />,
            menuItem: MenuItem.FilterSpendType,
            label: 'By Type',
        },
        {
            view: SummaryView.TotalSpendByLocation,
            component: <TotalSpendByLocation />,
            menuItem: MenuItem.FilterLocation,
            label: 'By Location',
        },
    ]

    useEffect(() => {
        const activeViewData = SummaryViews.find((viewData) => viewData.view === activeView)
        if (activeViewData) {
            setActiveComponent(activeViewData.component)
        }
    }, [activeView])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    margin: 1,
                    marginTop: 0,
                }}>
                <TotalSpend />
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                {activeComponent}
            </Box>
        </Box>
    )
}
