import { Box, ClickAwayListener, Typography } from '@mui/material'
import type { ComponentType } from 'react'
import { useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { DebtOverview } from 'components/debt/debt-overview'
import { Links } from 'components/links/links'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { defaultBackgroundColor } from 'utils/colors'
import { getToolsMenuItemIcon } from 'utils/icons'

export { ToolsMenuItem } from 'components/menu/enums'
import { ToolsMenuItem } from 'components/menu/enums'

type ToolsMenuItemData = {
    Component: ComponentType
    label: string
}

export const ToolsMenuItemMap: Map<ToolsMenuItem, ToolsMenuItemData> = new Map([
    [
        ToolsMenuItem.Receipts,
        {
            Component: ReceiptsList,
            label: 'Receipts',
        },
    ],
    [
        ToolsMenuItem.DebtCalculator,
        {
            Component: DebtOverview,
            label: 'Debt',
        },
    ],
    [
        ToolsMenuItem.Links,
        {
            Component: Links,
            label: 'Links',
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

export const useToolsMenuStore = create<ToolsMenuState & ToolsMenuActions>(
    (set) => ({
        ...initialState,

        setActiveItem: (item) => {
            set(() => ({
                activeItem: item,
            }))
        },
        reset: () => {
            set(initialState)
        },
    })
)

export const ToolsMenu = () => {
    const { activeItem, setActiveItem } = useToolsMenuStore(
        useShallow((state) => state)
    )
    const { showIconLabels } = useSettingsIconLabelsStore(
        useShallow((state) => state)
    )

    const [toolMenuExpanded, setToolMenuExpanded] = useState(false)

    const handleMenuItemClick = (item: ToolsMenuItem) => {
        setActiveItem(item)
        setToolMenuExpanded(false)
    }

    // styling
    const iconBoxWidth = 24
    const iconBoxMaxWidth = 86

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
            }}>
            <ClickAwayListener onClickAway={() => setToolMenuExpanded(false)}>
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
                            alignItems: 'center',
                            padding: 1,
                            width: showIconLabels
                                ? iconBoxMaxWidth
                                : iconBoxWidth,
                            height: iconBoxWidth,
                            borderTop: '1px solid #FBBC04',
                            borderRight: '1px solid #FBBC04',
                            borderBottom: toolMenuExpanded
                                ? '1px solid #FFFFEF'
                                : '1px solid #FBBC04',
                            borderLeft: '1px solid #FBBC04',
                            borderTopRightRadius: '10px',
                            borderTopLeftRadius: '10px',
                            borderBottomLeftRadius: toolMenuExpanded
                                ? 0
                                : '10px',
                            borderBottomRightRadius: toolMenuExpanded
                                ? 0
                                : '10px',
                            backgroundColor: defaultBackgroundColor,
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
                                backgroundColor: defaultBackgroundColor,
                            }}>
                            {Object.values(ToolsMenuItem).map((item, index) => {
                                return (
                                    <Box
                                        key={'tools-menu-item-' + index}
                                        onClick={() =>
                                            handleMenuItemClick(
                                                item as ToolsMenuItem
                                            )
                                        }
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-start',
                                            alignItems: 'center',
                                            margin: 1,
                                            width: showIconLabels
                                                ? iconBoxMaxWidth
                                                : iconBoxWidth,
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
                                                    activeItem === item
                                                        ? '#FBBC04'
                                                        : defaultBackgroundColor,
                                            }}>
                                            {getToolsMenuItemIcon(
                                                item as ToolsMenuItem
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                maxWidth: showIconLabels
                                                    ? iconBoxMaxWidth
                                                    : 0,
                                                overflow: 'hidden',
                                            }}>
                                            <Typography
                                                sx={{
                                                    marginLeft: 1,
                                                    fontSize: 12,
                                                    textAlign: 'left',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                {
                                                    ToolsMenuItemMap.get(item)!
                                                        .label
                                                }
                                            </Typography>
                                        </Box>
                                    </Box>
                                )
                            })}
                        </Box>
                    </Box>
                </Box>
            </ClickAwayListener>
        </Box>
    )
}
