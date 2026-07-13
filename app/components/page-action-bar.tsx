'use client'

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { Box, Typography } from '@mui/material'

import { colors } from '@/lib/colors'

type ActionBarContextValue = {
    active: boolean
    setActive: (active: boolean) => void
}

const ActionBarContext = createContext<ActionBarContextValue>({
    active: false,
    setActive: () => {},
})

const emptySubscribe = () => () => {}

/**
 * Wraps the app shell so leaf pages can swap the bottom tab bar for their
 * own action bar. The layout reads usePageActionBarActive() to hide the tab
 * bar while a PageActionBar is mounted.
 */
export function PageActionBarProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [active, setActive] = useState(false)
    const value = useMemo(() => ({ active, setActive }), [active])
    return (
        <ActionBarContext.Provider value={value}>
            {children}
        </ActionBarContext.Provider>
    )
}

/** True while a PageActionBar is mounted — the tab bar should hide. */
export const usePageActionBarActive = () => useContext(ActionBarContext).active

/**
 * Contextual action bar for leaf pages (expense detail, add/edit forms).
 * Takes over the bottom tab bar's slot while mounted, styled identically to
 * it — the four nav tabs are simply replaced by the page's actions
 * (PageActionButton children).
 */
export function PageActionBar({ children }: { children: React.ReactNode }) {
    const { setActive } = useContext(ActionBarContext)

    useEffect(() => {
        setActive(true)
        return () => setActive(false)
    }, [setActive])

    // Portal target is only available client-side (guards SSR/hydration:
    // server snapshot is false, so the first client render matches)
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    )
    if (!mounted) return null

    // Portaled to <body>: iOS clips position-fixed elements that live inside
    // an overflow scroller (#main-scroll) to the scroller's bounds, which put
    // this bar entirely outside its clip — invisible on the phone. Rendering
    // it beside the tab bar it replaces keeps it viewport-anchored everywhere.
    return createPortal(
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                position: 'fixed',
                bottom: 0,
                width: '100%',
                height: `calc(64px + env(safe-area-inset-bottom, 0px))`,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                backgroundColor: colors.primaryYellow,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                zIndex: 10,
            }}>
            {children}
        </Box>,
        document.body
    )
}

/** One action in the bar — icon over label, matching the nav tab items. */
export function PageActionButton({
    icon,
    label,
    onClick,
    color = colors.primaryBrown,
    disabled = false,
}: {
    icon: React.ReactNode
    label: string
    onClick: () => void
    color?: string
    disabled?: boolean
}) {
    return (
        <Box
            onClick={disabled ? undefined : onClick}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                flex: 1,
                height: '100%',
                cursor: disabled ? 'default' : 'pointer',
                userSelect: 'none',
                color,
                opacity: disabled ? 0.5 : 1,
                transition: 'opacity 0.15s',
            }}>
            {icon}
            <Typography
                sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1,
                }}>
                {label}
            </Typography>
        </Box>
    )
}
