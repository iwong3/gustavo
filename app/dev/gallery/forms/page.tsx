'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Box, Typography } from '@mui/material'
import { IconArrowLeft } from '@tabler/icons-react'

import DeleteExpenseDialog from 'components/delete-expense-dialog'
import DeleteTripDialog from 'components/delete-trip-dialog'
import ExpenseFormDialog from 'components/expense-form-dialog'
import TripFormDialog from 'components/trip-form-dialog'
import { TripDataProvider } from 'providers/trip-data-provider'
import { colors, hardShadow } from '@/lib/colors'
import { GusMenuButton } from '../gallery-ui'
import { expenses, trip } from '../fixtures'

const noop = () => {}

// Matches FormDrawer's HEADER_HEIGHT — the drawer panel starts below this,
// so the switcher header and an open form never overlap.
const HEADER_HEIGHT = 56

const FORMS = [
    { key: 'expense-add', label: 'Expense · add' },
    { key: 'expense-edit', label: 'Expense · edit' },
    { key: 'trip-create', label: 'Trip · create' },
    { key: 'trip-edit', label: 'Trip · edit' },
    { key: 'delete-expense', label: 'Delete expense' },
    { key: 'delete-trip', label: 'Delete trip' },
] as const

type FormKey = (typeof FORMS)[number]['key']

export default function FormsGallery() {
    const [selected, setSelected] = useState<FormKey | null>(null)

    const close = () => setSelected(null)

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: colors.secondaryYellow }}>
            {/* Fixed header with the form switcher. Above FormDrawer (1200) and
                MUI Dialog (1300) so the chips stay tappable while a form is open. */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: HEADER_HEIGHT,
                    zIndex: 1400,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    backgroundColor: colors.primaryYellow,
                    borderBottom: `2px solid ${colors.primaryBlack}`,
                }}>
                <GusMenuButton />
                <Link href="/dev/gallery" style={{ display: 'flex', color: colors.primaryBlack }}>
                    <IconArrowLeft size={20} />
                </Link>
                <Typography sx={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                    Forms
                </Typography>
                {/* Chips — single row, horizontal scroll */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        overflowX: 'auto',
                        flex: 1,
                        py: 1,
                        // room for the hard shadow so it isn't clipped
                        pr: 0.5,
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                    {FORMS.map((f) => {
                        const active = selected === f.key
                        return (
                            <Box
                                key={f.key}
                                onClick={() => setSelected(active ? null : f.key)}
                                sx={{
                                    px: 1.25,
                                    py: 0.5,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    backgroundColor: active ? colors.primaryBlack : colors.primaryWhite,
                                    color: active ? colors.primaryWhite : colors.primaryBlack,
                                    ...hardShadow,
                                    '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                                    transition: 'transform 0.1s, box-shadow 0.1s',
                                }}>
                                {f.label}
                            </Box>
                        )
                    })}
                </Box>
            </Box>

            {/* Page body — only visible when no form is open */}
            <Box sx={{ pt: `${HEADER_HEIGHT + 16}px`, px: 2, pb: 4 }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 480 }}>
                    Tap a chip to open that form — the header stays on top, so you can flip
                    directly between forms to compare. Dropdown data (categories, users)
                    loads from the local API — needs a signed-in browser. Submitting writes
                    to your local dev DB; the delete buttons are no-ops.
                </Typography>
            </Box>

            <TripDataProvider trip={trip} expenses={expenses}>
                <ExpenseFormDialog
                    open={selected === 'expense-add'}
                    onClose={close}
                    onSuccess={close}
                    mode="add"
                />
                <ExpenseFormDialog
                    open={selected === 'expense-edit'}
                    onClose={close}
                    onSuccess={close}
                    mode="edit"
                    expense={expenses[0]}
                />
            </TripDataProvider>

            <TripFormDialog
                open={selected === 'trip-create'}
                onClose={close}
                onSuccess={close}
                mode="create"
            />
            <TripFormDialog
                open={selected === 'trip-edit'}
                onClose={close}
                onSuccess={close}
                mode="edit"
                trip={trip}
            />

            <DeleteExpenseDialog
                open={selected === 'delete-expense'}
                expense={expenses[0]}
                onClose={close}
                onConfirm={noop}
            />
            <DeleteTripDialog
                open={selected === 'delete-trip'}
                trip={trip}
                onClose={close}
                onConfirm={noop}
            />
        </Box>
    )
}
