import { Box } from '@mui/material'
import { useState } from 'react'

import { TotalSpend } from 'components/summary/summary-items/total-spend'
import { TotalSpendByLocation } from 'components/summary/summary-items/total-spend-by-location'
import { TotalSpendByPerson } from 'components/summary/summary-items/total-spend-by-person'
import { TotalSpendByType } from 'components/summary/summary-items/total-spend-by-type'
import { getMenuItemIcon } from 'helpers/icons'
import { MenuItem } from 'components/menu/menu'

enum SummaryView {
    TotalSpendByPerson = 'TotalSpendByPerson',
    TotalSpendByType = 'TotalSpendByType',
    TotalSpendByLocation = 'TotalSpendByLocation',
}

export const Summary = () => {
    const [activeView, setActiveView] = useState<SummaryView>(SummaryView.TotalSpendByPerson)

    const views = [
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

    const renderView = () => {
        const view = views.find((view) => view.view === activeView)
        return view?.component
    }

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
                }}>
                <TotalSpend />
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    margin: 1,
                }}>
                {views.map((view, index) => {
                    return (
                        <Box
                            key={'summary-view-menu-item-' + index}
                            onClick={() => setActiveView(view.view)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: 0.5,
                                marginRight: index === views.length - 1 ? 0 : 0.5,
                                marginLeft: index === 0 ? 0 : 0.5,
                                width: '100%',
                                border:
                                    view.view === activeView
                                        ? '2px solid white'
                                        : '2px solid #FBBC04',
                                borderRadius: '10px',
                                backgroundColor: view.view === activeView ? '#fcca46' : 'white',
                                transition: 'background-color 0.1s',
                            }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    // height: 20,
                                }}>
                                {getMenuItemIcon(view.menuItem, 18)}
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',

                                    marginLeft: 0.5,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    fontStyle: 'italic',
                                }}>
                                {view.label}
                            </Box>
                        </Box>
                    )
                })}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                {renderView()}
            </Box>
        </Box>
    )
}
