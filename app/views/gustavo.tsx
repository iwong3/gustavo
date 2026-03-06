import { Box, Fab } from '@mui/material'
import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'

import ExpenseFormDialog from 'components/expense-form-dialog'
import { RefreshProvider } from 'providers/refresh-provider'
import { ActiveMenuItems } from 'components/menu/active-menu-items'
import { Menu } from 'components/menu/menu'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import {
    ToolsMenuItem,
    ToolsMenuItemMap,
    useToolsMenuStore,
} from 'components/menu/tools/tools-menu'
import { useSummaryStore } from 'components/summary/summary'

type GustavoProps = {
    onRefresh?: () => void
}

export const Gustavo = ({ onRefresh }: GustavoProps) => {
    const [addDialogOpen, setAddDialogOpen] = useState(false)

    const activeItem = useToolsMenuStore((s) => s.activeItem)
    const setActiveItem = useToolsMenuStore((s) => s.setActiveItem)
    const setActiveView = useSummaryStore((s) => s.setActiveView)
    const showIconLabels = useSettingsIconLabelsStore((s) => s.showIconLabels)

    const scrollHeightCss = showIconLabels ? '72dvh' : '74dvh'

    const ActiveComponent = ToolsMenuItemMap.get(activeItem)?.Component ?? null

    // swipe left & right
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null) // otherwise the swipe is fired even with usual touch events
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        const items = Object.values(ToolsMenuItem)
        const currentIndex = items.indexOf(activeItem)

        // next item
        if (isLeftSwipe) {
            const nextIndex = (currentIndex + 1) % items.length
            let nextItem = items[nextIndex]

            if (nextItem === ToolsMenuItem.TotalSpend) {
                nextItem = items[nextIndex + 1]
            }
            if (ToolsMenuItemMap.get(nextItem)!.summaryView) {
                setActiveView(ToolsMenuItemMap.get(nextItem)!.summaryView!)
            }
            setActiveItem(nextItem)
        }

        // previous item
        if (isRightSwipe) {
            const prevIndex = (currentIndex - 1 + items.length) % items.length
            let prevItem = items[prevIndex]

            if (prevItem === ToolsMenuItem.TotalSpend) {
                prevItem = items[prevIndex - 1]
            }
            if (ToolsMenuItemMap.get(prevItem)!.summaryView) {
                setActiveView(ToolsMenuItemMap.get(prevItem)!.summaryView!)
            }
            setActiveItem(prevItem)
        }
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            {activeItem != ToolsMenuItem.Links && (
                <Box
                    sx={{
                        marginBottom: 1,
                    }}>
                    <ActiveMenuItems />
                </Box>
            )}
            <RefreshProvider onRefresh={() => onRefresh?.()}>
                <Box
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    sx={{
                        height: scrollHeightCss,
                        maxHeight: scrollHeightCss,
                        maxWidth: 450,
                        overflow: 'hidden',
                        overflowY: 'scroll',
                    }}>
                    {ActiveComponent && <ActiveComponent />}
                </Box>
            </RefreshProvider>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                <Menu />
            </Box>

            {/* Add expense FAB */}
            <Fab
                onClick={() => setAddDialogOpen(true)}
                size="medium"
                sx={{
                    'position': 'fixed',
                    'bottom': 140,
                    'right': 16,
                    'backgroundColor': '#FBBC04',
                    '&:hover': { backgroundColor: '#E5A800' },
                    'zIndex': 9,
                }}>
                <IconPlus size={24} />
            </Fab>

            <ExpenseFormDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onSuccess={() => onRefresh?.()}
                mode="add"
            />
        </Box>
    )
}
