'use client'

import { colors } from '@/lib/colors'
import { Box, Fade, Slide } from '@mui/material'
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
            {/* Backdrop */}
            <Fade in={open} timeout={300}>
                <Box
                    onClick={onClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1200,
                    }}
                />
            </Fade>

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
                        backgroundColor: colors.secondaryYellow,
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        zIndex: 1300,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundImage: `linear-gradient(${colors.secondaryYellow}CC, ${colors.secondaryYellow}EE), url(/lined-paper.jpg)`,
                            backgroundSize: '100%, 120%',
                            backgroundPosition: 'top left, top left',
                            backgroundRepeat: 'no-repeat, no-repeat',
                            backgroundAttachment: 'local, local',
                        }}>
                        {children}
                    </Box>
                </Box>
            </Slide>
        </>,
        document.body
    )
}
