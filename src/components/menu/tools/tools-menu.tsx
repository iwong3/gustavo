import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { DebtCalculator } from 'components/debt/debt-calculator'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { Summary } from 'components/summary/summary'
import { getToolsMenuItemIcon } from 'helpers/icons'

export enum ToolsMenuItem {
    Receipts = 'Receipts',
    DebtCalculator = 'DebtCalculator',
    TotalSpend = 'SpendByDate',
}

type ToolsMenuItemData = {
    component: JSX.Element
    label: string
}

export const ToolsMenuItemMap: Map<ToolsMenuItem, ToolsMenuItemData> = new Map([
    [
        ToolsMenuItem.Receipts,
        {
            component: <ReceiptsList />,
            label: 'Receipts',
        },
    ],
    [
        ToolsMenuItem.DebtCalculator,
        {
            component: <DebtCalculator />,
            label: 'Debt',
        },
    ],
    [
        ToolsMenuItem.TotalSpend,
        {
            component: <Summary />,
            label: 'Totals',
        },
    ],
])

type ToolsMenuState = {
    activeItem: ToolsMenuItem
}

type ToolsMenuActions = {
    setActiveItem: (item: ToolsMenuItem) => void
    reset: () => void
}

const initialState: ToolsMenuState = {
    activeItem: ToolsMenuItem.Receipts,
}

export const useToolsMenuStore = create<ToolsMenuState & ToolsMenuActions>((set) => ({
    ...initialState,

    setActiveItem: (item) => {
        set(() => ({
            activeItem: item,
        }))
    },
    reset: () => {
        set(initialState)
    },
}))

export const ToolsMenu = () => {
    const { activeItem, setActiveItem } = useToolsMenuStore(useShallow((state) => state))
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

    const [toolMenuExpanded, setToolMenuExpanded] = useState(false)

    const iconBoxWidth = 24
    const iconBoxMaxWidth = 86

    const handleMenuItemClick = (item: ToolsMenuItem) => {
        setActiveItem(item)
        setToolMenuExpanded(false)
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
            }}>
            <Box
                sx={{
                    display: 'inline-block',
                    position: 'relative',
                }}>
                {/* Active tool */}
                <Box
                    onClick={() => setToolMenuExpanded(!toolMenuExpanded)}
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        padding: 1,
                        width: showIconLabels ? iconBoxMaxWidth : iconBoxWidth,
                        height: iconBoxWidth,
                        borderTop: '1px solid #FBBC04',
                        borderRight: '1px solid #FBBC04',
                        borderBottom: toolMenuExpanded ? '1px solid white' : '1px solid #FBBC04',
                        borderLeft: '1px solid #FBBC04',
                        borderTopRightRadius: '10px',
                        borderTopLeftRadius: '10px',
                        borderBottomLeftRadius: toolMenuExpanded ? 0 : '10px',
                        borderBottomRightRadius: toolMenuExpanded ? 0 : '10px',
                        backgroundColor: 'white',
                        transition: 'width 0.1s ease-out',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: iconBoxWidth,
                            height: iconBoxWidth,
                        }}>
                        {getToolsMenuItemIcon(activeItem)}
                    </Box>
                    <Box
                        sx={{
                            maxWidth: showIconLabels ? iconBoxMaxWidth : 0,
                            overflow: 'hidden',
                        }}>
                        <Typography
                            sx={{
                                marginLeft: 1,
                                fontSize: 12,
                                textAlign: 'left',
                                whiteSpace: 'nowrap',
                            }}>
                            {ToolsMenuItemMap.get(activeItem)!.label}
                        </Typography>
                    </Box>
                </Box>
                {/* Menu */}
                <Box
                    sx={{
                        display: 'flex',
                        position: 'absolute',
                        maxHeight: toolMenuExpanded ? 9999 : 0,
                        overflow: 'hidden',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            border: '1px solid #FBBC04',
                            borderBottomLeftRadius: '10px',
                            borderBottomRightRadius: '10px',
                            backgroundColor: 'white',
                        }}>
                        {Object.values(ToolsMenuItem).map((item, index) => {
                            return (
                                <Box
                                    key={'tools-menu-item-' + index}
                                    onClick={() => handleMenuItemClick(item as ToolsMenuItem)}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-start',
                                        alignItems: 'center',
                                        padding: 1,
                                        width: showIconLabels ? iconBoxMaxWidth : iconBoxWidth,
                                        height: iconBoxWidth,
                                        transition: 'width 0.1s ease-out',
                                    }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            width: iconBoxWidth,
                                            height: iconBoxWidth,
                                            borderRadius: '100%',
                                            backgroundColor:
                                                activeItem === item ? '#FBBC04' : 'white',
                                        }}>
                                        {getToolsMenuItemIcon(item as ToolsMenuItem)}
                                    </Box>
                                    <Box
                                        sx={{
                                            maxWidth: showIconLabels ? iconBoxMaxWidth : 0,
                                            overflow: 'hidden',
                                        }}>
                                        <Typography
                                            sx={{
                                                marginLeft: 1,
                                                fontSize: 12,
                                                textAlign: 'left',
                                                whiteSpace: 'nowrap',
                                            }}>
                                            {ToolsMenuItemMap.get(item)!.label}
                                        </Typography>
                                    </Box>
                                </Box>
                            )
                        })}
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
