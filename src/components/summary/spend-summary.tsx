import Box from '@mui/material/Box'
import { useShallow } from 'zustand/react/shallow'

import { useToolsMenuDebtStore } from 'components/menu/tools/tools-menu-debt'
import { SummaryByDate } from 'components/summary/summary-items/summary-by-date'
import { SummaryByPerson } from 'components/summary/summary-items/summary-by-person'
import { SummaryDebt } from 'components/summary/summary-items/debt/summary-debt'
import { useEffect, useState } from 'react'
import { useToolsMenuSpendByDateStore } from 'components/menu/tools/tools-menu-spend-by-date'
import { ToolsMenu } from 'components/menu/tools/tools-menu'

/**
 * Summarizes every person's spend data
 * - Total covered
 * - Total spent (net spent)
 * - Total owed
 * - Total owed to each person
 *
 * Other views / ideas
 * - Total spend by day
 * - Bar graph of total spend by person
 * - Whole trip totals
 * - Click any 2 people to show their debts to each other
 * - Horizontally scrollable graphs
 */

enum ToolView {
    Debt,
    SpendByDate,
}

type ToolViewData = {
    view: ToolView
    component: JSX.Element
    menuState: any
}

export const SpendSummary = () => {
    const toolsMenuDebtState = useToolsMenuDebtStore(useShallow((state) => state))
    const toolsMenuSpendByDateState = useToolsMenuSpendByDateStore(useShallow((state) => state))

    const toolViews: ToolViewData[] = [
        {
            view: ToolView.Debt,
            component: <SummaryDebt />,
            menuState: toolsMenuDebtState,
        },
        {
            view: ToolView.SpendByDate,
            component: <SummaryByDate />,
            menuState: toolsMenuSpendByDateState,
        },
    ]

    const toolViewStates = toolViews.map((view) => view.menuState)

    const [activeView, setActiveView] = useState<ToolViewData>(toolViews[0])

    useEffect(() => {
        toolViews.some((view) => {
            if (view.menuState.isActive()) {
                setActiveView(view)
                return true
            }
            return false
        })
    }, [...toolViewStates])

    return (
        <Box sx={{ marginBottom: 16 }}>
            <Box sx={{ margin: 1 }}>
                <ToolsMenu />
            </Box>
            {activeView.component}
        </Box>
    )
}
