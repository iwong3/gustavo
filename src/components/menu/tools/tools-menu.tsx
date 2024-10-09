import { Box } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { ToolsMenuDebt, useToolsMenuDebtStore } from 'components/menu/tools/tools-menu-debt'
import {
    ToolsMenuSpendByDate,
    useToolsMenuSpendByDateStore,
} from 'components/menu/tools/tools-menu-spend-by-date'

enum ToolsMenuItem {
    ToolsDebt,
    ToolsSpendByDate,
}

type ToolsMenuItemData = {
    type: ToolsMenuItem
    component: JSX.Element
    state: any
}

type ToolsMenuActions = {
    isActive: () => boolean

    reset: () => void
}

export const useToolsMenuStore = create<ToolsMenuActions>(() => ({
    isActive: () => false,

    reset: () => {},
}))

const toolsMenuStoreResets = new Set<() => void>()

export const resetAllToolsMenuStores = () => {
    toolsMenuStoreResets.forEach((reset) => reset())
}

export const ToolsMenu = () => {
    const toolsDebtState = useToolsMenuDebtStore(useShallow((state) => state))
    const toolsSpendByDateState = useToolsMenuSpendByDateStore(useShallow((state) => state))

    const toolsMenuItems: ToolsMenuItemData[] = [
        {
            type: ToolsMenuItem.ToolsDebt,
            component: <ToolsMenuDebt />,
            state: toolsDebtState,
        },
        {
            type: ToolsMenuItem.ToolsSpendByDate,
            component: <ToolsMenuSpendByDate />,
            state: toolsSpendByDateState,
        },
    ]

    const toolsMenuStates = toolsMenuItems.map((item) => item.state)
    toolsMenuStates.forEach((state) => {
        toolsMenuStoreResets.add(state.reset)
    })

    // make sure one summary menu item is always active
    // defaults to the first summary menu item
    useEffect(() => {
        if (!toolsMenuStates.some((state) => state.isActive())) {
            toolsMenuItems[0].state.toggleActive()
        }
    }, [...toolsMenuStates])

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-evenly',
                alignItems: 'center',
                paddingY: 1,
                border: '1px solid #FBBC04',
                borderRadius: 4,
                backgroundColor: 'white',
            }}>
            {toolsMenuItems.map((menuItem, index) => {
                return (
                    <Box
                        key={'tools-menu-item-' + index}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        {menuItem.component}
                    </Box>
                )
            })}
        </Box>
    )
}
