import { Box } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { MenuItem } from 'components/menu/menu'
import { TotalSpendByPerson } from 'components/summary/summary-items/total-spend-by-person'
import { TotalSpendByType } from 'components/summary/summary-items/total-spend-by-type'
import { TotalSpendByLocation } from 'components/summary/summary-items/total-spend-by-location'
import { getMenuItemIcon } from 'helpers/icons'

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

type SummaryViewMenuState = {
    activeView: SummaryView
    activeComponent: JSX.Element
}

type SummaryViewMenuActions = {
    setActiveView: (view: SummaryView) => void
    setActiveComponent: (component: JSX.Element) => void
}

const initialState: SummaryViewMenuState = {
    activeView: SummaryView.TotalSpendByPerson,
    activeComponent: <TotalSpendByPerson />,
}

export const useSummaryViewMenuStore = create<SummaryViewMenuState & SummaryViewMenuActions>(
    (set) => ({
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
    })
)

export const SummaryViewMenu = () => {
    const { activeView, setActiveView, setActiveComponent } = useSummaryViewMenuStore(
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

    const handleClick = (viewData: SummaryViewData) => {
        setActiveView(viewData.view)
        setActiveComponent(viewData.component)
    }

    return (
        <Box
            sx={{
                display: 'flex',
                marginLeft: 1,
            }}>
            {SummaryViews.map((view, index) => {
                return (
                    <Box
                        key={'summary-view-menu-item-' + index}
                        onClick={() => handleClick(view)}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 0.5,
                            height: 20,
                            borderTop: '1px solid #FBBC04',
                            borderBottom: '1px solid #FBBC04',
                            borderLeft:
                                index === 0
                                    ? '1px solid #FBBC04'
                                    : index === SummaryViews.length - 1
                                    ? '1px solid #FBBC04'
                                    : 'none',
                            borderRight:
                                index === 0
                                    ? '1px solid #FBBC04'
                                    : index === SummaryViews.length - 1
                                    ? '1px solid #FBBC04'
                                    : 'none',
                            borderTopLeftRadius: index === 0 ? '10px' : 0,
                            borderBottomLeftRadius: index === 0 ? '10px' : 0,
                            borderTopRightRadius: index === SummaryViews.length - 1 ? '10px' : 0,
                            borderBottomRightRadius: index === SummaryViews.length - 1 ? '10px' : 0,
                            backgroundColor: view.view === activeView ? '#fcca46' : 'white',
                            transition: 'background-color 0.1s',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            {getMenuItemIcon(view.menuItem, 20)}
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}
