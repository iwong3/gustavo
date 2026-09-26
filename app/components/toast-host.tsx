'use client'

import { Box } from '@mui/material'
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { colors, toneColors } from '@/lib/colors'
import { useToastStore } from 'components/toast-store'

const DURATION_MS = 4000
// A toast with an action (Undo) stays a little longer so it can be caught
const ACTION_DURATION_MS = 5500

/**
 * Renders the current toast from useToastStore. Mount once in the app
 * layout. Portaled to document.body — position: fixed inside #main-scroll
 * gets clipped on iOS. Sits just above the bottom bar; tap to dismiss, or
 * tap its action (e.g. Undo).
 */
export function ToastHost() {
    const toast = useToastStore((s) => s.toast)
    const dismiss = useToastStore((s) => s.dismiss)

    useEffect(() => {
        if (!toast) return
        const t = setTimeout(dismiss, toast.action ? ACTION_DURATION_MS : DURATION_MS)
        return () => clearTimeout(t)
    }, [toast, dismiss])

    if (!toast || typeof document === 'undefined') return null

    const accent =
        toast.tone === 'error'
            ? colors.primaryRed
            : toast.tone === 'success'
              ? toneColors.positive
              : colors.primaryBlack
    const Icon =
        toast.tone === 'error' ? IconAlertTriangle : toast.tone === 'success' ? IconCircleCheck : IconInfoCircle

    return createPortal(
        <Box
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            onClick={dismiss}
            sx={{
                'position': 'fixed',
                'left': 16,
                'right': 16,
                'bottom': 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)',
                'maxWidth': 450,
                'mx': 'auto',
                'zIndex': 1500,
                'display': 'flex',
                'alignItems': 'center',
                'gap': 1.25,
                'px': 1.75,
                'py': 1.25,
                'backgroundColor': colors.primaryWhite,
                'border': `1px solid ${colors.primaryBlack}`,
                'borderLeft': `5px solid ${accent}`,
                'borderRadius': '4px',
                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                'fontSize': 14,
                'fontWeight': 600,
                'color': colors.primaryBlack,
                'cursor': 'pointer',
                'animation': 'toastIn 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                '@keyframes toastIn': {
                    from: { opacity: 0, transform: 'translateY(12px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}>
            <Icon size={18} stroke={2} color={accent} style={{ flexShrink: 0 }} />
            <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                {toast.message}
            </Box>
            {toast.action && (
                <Box
                    component="button"
                    type="button"
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        toast.action!.onClick()
                        dismiss()
                    }}
                    sx={{
                        'flexShrink': 0,
                        'height': 30,
                        'paddingX': 1.25,
                        'marginY': -0.5,
                        'border': `1px solid ${colors.primaryBlack}`,
                        'borderRadius': '4px',
                        'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                        'backgroundColor': colors.primaryYellow,
                        'font': 'inherit',
                        'fontSize': 12.5,
                        'fontWeight': 800,
                        'color': colors.primaryBlack,
                        'cursor': 'pointer',
                        '&:active': { boxShadow: 'none', transform: 'translate(1.5px, 1.5px)' },
                        'transition': 'transform 0.1s, box-shadow 0.1s',
                    }}>
                    {toast.action.label}
                </Box>
            )}
        </Box>,
        document.body
    )
}
