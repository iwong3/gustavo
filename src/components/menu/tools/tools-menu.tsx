import { Box, ClickAwayListener, Typography } from '@mui/material'
import { useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { DebtCalculator } from 'components/debt/debt-calculator'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { Summary, SummaryView, useSummaryStore } from 'components/summary/summary'
import { defaultBackgroundColor } from 'helpers/colors'
import { getToolsMenuItemIcon } from 'helpers/icons'

export enum ToolsMenuItem {
    Receipts = 'Receipts',
    DebtCalculator = 'DebtCalculator',
    TotalSpend = 'TotalSpend',
    TotalSpendByPerson = 'TotalSpendByPerson',
    TotalSpendByType = 'TotalSpendByType',
    TotalSpendByLocation = 'TotalSpendByLocation',
    TotalSpendByDate = 'TotalSpendByDate',
}

type ToolsMenuItemData = {
    component: JSX.Element
    label: string
    indent: boolean
    summaryView?: SummaryView
}

export const ToolsMenuItemMap: Map<ToolsMenuItem, ToolsMenuItemData> = new Map([
    [
        ToolsMenuItem.Receipts,
        {
            component: <ReceiptsList />,
            label: 'Receipts',
            indent: false,
        },
    ],
    [
        ToolsMenuItem.DebtCalculator,
        {
            component: <DebtCalculator />,
            label: 'Debt',
            indent: false,
        },
    ],
    [
        ToolsMenuItem.TotalSpend,
        {
            component: <Summary />,
            label: 'Totals',
            indent: false,
        },
    ],
    [
        ToolsMenuItem.TotalSpendByPerson,
        {
            component: <Summary />,
            label: 'Person',
            indent: true,
            summaryView: SummaryView.TotalSpendByPerson,
        },
    ],
    [
        ToolsMenuItem.TotalSpendByType,
        {
            component: <Summary />,
            label: 'Type',
            indent: true,
            summaryView: SummaryView.TotalSpendByType,
        },
    ],
    [
        ToolsMenuItem.TotalSpendByLocation,
        {
            component: <Summary />,
            label: 'Location',
            indent: true,
            summaryView: SummaryView.TotalSpendByLocation,
        },
    ],
    [
        ToolsMenuItem.TotalSpendByDate,
        {
            component: <Summary />,
            label: 'Date',
            indent: true,
            summaryView: SummaryView.TotalSpendByDate,
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
    const { setActiveView } = useSummaryStore(useShallow((state) => state))
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

    const [toolMenuExpanded, setToolMenuExpanded] = useState(false)

    const totalSpendSubItems = [
        ToolsMenuItem.TotalSpendByPerson,
        ToolsMenuItem.TotalSpendByType,
        ToolsMenuItem.TotalSpendByLocation,
        ToolsMenuItem.TotalSpendByDate,
    ]

    const handleMenuItemClick = (item: ToolsMenuItem) => {
        // clicking TotalSpend should do nothing if a TotalSpend subitem is already active
        if (item === ToolsMenuItem.TotalSpend && totalSpendSubItems.includes(activeItem)) {
            setToolMenuExpanded(false)
        } else {
            // clicking TotalSpend when not on a subitem should default to TotalSpendByPerson
            if (item === ToolsMenuItem.TotalSpend) {
                setActiveView(SummaryView.TotalSpendByPerson)
            }

            if (ToolsMenuItemMap.get(item)!.summaryView) {
                setActiveView(ToolsMenuItemMap.get(item)!.summaryView!)
            }
            setActiveItem(item)
            setToolMenuExpanded(false)
        }
    }

    // styling
    const iconBoxWidth = 24
    const iconBoxMaxWidth = 86

    const itemSelectedOverride = (item: ToolsMenuItem): boolean => {
        // If any TotalSpend subitem is active, set TotalSpend as selected too
        if (item === ToolsMenuItem.TotalSpend && totalSpendSubItems.includes(activeItem)) {
            return true
        }
        // If TotalSpend selected, default subitem is TotalSpendByPerson
        if (item === ToolsMenuItem.TotalSpendByPerson && activeItem === ToolsMenuItem.TotalSpend) {
            return true
        }
        return false
    }

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
                            width: showIconLabels ? iconBoxMaxWidth : iconBoxWidth,
                            height: iconBoxWidth,
                            borderTop: '1px solid #FBBC04',
                            borderRight: '1px solid #FBBC04',
                            borderBottom: toolMenuExpanded
                                ? '1px solid #FFFFEF'
                                : '1px solid #FBBC04',
                            borderLeft: '1px solid #FBBC04',
                            borderTopRightRadius: '10px',
                            borderTopLeftRadius: '10px',
                            borderBottomLeftRadius: toolMenuExpanded ? 0 : '10px',
                            borderBottomRightRadius: toolMenuExpanded ? 0 : '10px',
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
                            {getToolsMenuItemIcon(
                                activeItem === ToolsMenuItem.TotalSpend
                                    ? ToolsMenuItem.TotalSpendByPerson
                                    : activeItem
                            )}
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
                                        onClick={() => handleMenuItemClick(item as ToolsMenuItem)}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-start',
                                            alignItems: 'center',
                                            margin: 1,
                                            width: showIconLabels ? iconBoxMaxWidth : iconBoxWidth,
                                            height: iconBoxWidth,
                                            transition: 'width 0.1s ease-out',
                                        }}>
                                        {showIconLabels &&
                                            ToolsMenuItemMap.get(item as ToolsMenuItem)!.indent && (
                                                <Box
                                                    sx={{
                                                        marginLeft: 0.25,
                                                        fontSize: 12,
                                                    }}>
                                                    •
                                                </Box>
                                            )}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginX:
                                                    showIconLabels &&
                                                    ToolsMenuItemMap.get(item as ToolsMenuItem)!
                                                        .indent
                                                        ? 0.5
                                                        : 0,
                                                width: iconBoxWidth,
                                                height: iconBoxWidth,
                                                borderRadius: '100%',
                                                backgroundColor:
                                                    activeItem === item ||
                                                    itemSelectedOverride(item)
                                                        ? '#FBBC04'
                                                        : defaultBackgroundColor,
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
                                                    marginLeft:
                                                        showIconLabels &&
                                                        ToolsMenuItemMap.get(item as ToolsMenuItem)!
                                                            .indent
                                                            ? 0
                                                            : 1,
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
            </ClickAwayListener>
        </Box>
    )
}
