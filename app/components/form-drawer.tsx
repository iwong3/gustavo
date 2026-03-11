'use client'

import { colors } from '@/lib/colors'
import { Box, Slide } from '@mui/material'
import { createPortal } from 'react-dom'

const HEADER_HEIGHT = 56

type Props = {
    open: boolean
    onClose: () => void
    children: React.ReactNode
}

export default function FormDrawer({ open, onClose, children }: Props) {
    if (typeof document === 'undefined') return null

    return createPortal(
        <>
            {/* Backdrop (transparent, just catches clicks to close) */}
            {open && (
                <Box
                    onClick={onClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1400,
                    }}
                />
            )}

            {/* Drawer panel */}
            <Slide
                direction="up"
                in={open}
                mountOnEnter
                unmountOnExit
                easing={{ enter: 'ease-out', exit: 'ease-in' }}
                timeout={300}>
                <Box
                    sx={{
                        position: 'fixed',
                        top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px) + 8px)`,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.primaryWhite,
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        borderTop: `2px solid ${colors.primaryBlack}`,
                        boxShadow: `2px -2px 0px ${colors.primaryBlack}`,
                        zIndex: 1500,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                    {children}
                </Box>
            </Slide>
        </>,
        document.body
    )
}
