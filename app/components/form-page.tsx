'use client'

import { Box, Typography } from '@mui/material'
import { IconCheck, IconX } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { colors } from '@/lib/colors'
import { errorMessageSx } from '@/lib/form-styles'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'
import { useScrollFocusedInput } from 'hooks/useScrollFocusedInput'

type Props = {
    /** "Add Expense", "Edit Workout", ... */
    title: string
    /** Right-aligned control in the title row — typically a PageInfo button. */
    titleExtra?: ReactNode
    /** The fields, top to bottom. See code-guide.md § Page-style forms for order. */
    children: ReactNode
    /** Inline error shown under the last field (red, bold). */
    error?: string
    onCancel: () => void
    onSubmit: () => void
    /** "Add" / "Save" / "Log" — the bar shows this on the confirm action. */
    submitLabel: string
    submitDisabled?: boolean
    /** True while the request is in flight — disables both actions. */
    busy?: boolean
    cancelLabel?: string
}

/**
 * Shell for every page-style form in the app (add/edit pages, not drawers).
 *
 *   ┌ title row — h6, optional ⓘ on the right
 *   ├ fields — one column, gap 2, 16px padding, keyboard-aware focus scroll
 *   └ PageActionBar — replaces the bottom tab bar: Cancel | <submitLabel>
 *
 * The page that renders it owns navigation (router.replace on cancel/success)
 * and the outer `maxWidth: 450` column; the form owns state + the request.
 * Reference usages: components/expense-form.tsx, components/health/workout-form.tsx.
 */
export function FormPage({
    title,
    titleExtra,
    children,
    error,
    onCancel,
    onSubmit,
    submitLabel,
    submitDisabled = false,
    busy = false,
    cancelLabel = 'Cancel',
}: Props) {
    // Scroll the focused input near the top so the mobile keyboard can't hide it
    const focusScroll = useScrollFocusedInput()

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    padding: '16px 16px 0',
                }}>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: colors.primaryBlack }}>
                    {title}
                </Typography>
                {titleExtra}
            </Box>
            <Box
                {...focusScroll}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '16px',
                }}>
                {children}

                {error && (
                    <Typography variant="body2" sx={errorMessageSx}>
                        {error}
                    </Typography>
                )}
            </Box>

            <PageActionBar>
                <PageActionButton
                    onClick={onCancel}
                    disabled={busy}
                    icon={<IconX size={22} />}
                    label={cancelLabel}
                />
                <PageActionButton
                    onClick={onSubmit}
                    disabled={busy || submitDisabled}
                    icon={<IconCheck size={22} />}
                    label={submitLabel}
                />
            </PageActionBar>
        </>
    )
}
