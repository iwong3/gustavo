'use client'

import { Box } from '@mui/material'
import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

const HeaderSlotContext = createContext<{
    el: HTMLElement | null
    setEl: (el: HTMLElement | null) => void
}>({ el: null, setEl: () => {} })

/** Wraps the app shell so pages can render into the fixed header's row. */
export function HeaderSlotProvider({ children }: { children: React.ReactNode }) {
    const [el, setEl] = useState<HTMLElement | null>(null)
    return <HeaderSlotContext.Provider value={{ el, setEl }}>{children}</HeaderSlotContext.Provider>
}

/** The app header's space right of the back button / Gus corner. */
export function HeaderSlotTarget() {
    const { setEl } = useContext(HeaderSlotContext)
    return (
        <Box
            ref={setEl}
            sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', '&:empty': { display: 'none' } }}
        />
    )
}

/**
 * Renders its children into the app header's row, beside the back button —
 * so a page's title row doesn't cost a row of its own. The header is fixed
 * and outside #main-scroll, so the content stays put while the page scrolls.
 */
export function HeaderSlot({ children }: { children: React.ReactNode }) {
    const { el } = useContext(HeaderSlotContext)
    if (!el) return null
    return createPortal(children, el)
}
