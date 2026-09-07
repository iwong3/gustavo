'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Box, Typography } from '@mui/material'
import { IconArrowLeft } from '@tabler/icons-react'

import DeleteExpenseDialog from 'components/delete-expense-dialog'
import DeleteTripDialog from 'components/delete-trip-dialog'
import ExpenseForm from 'components/expense-form'
import RoutineForm from 'components/health/routine-form'
import WorkoutForm from 'components/health/workout-form'
import TripForm from 'components/trip-form'
import { TripDataProvider } from 'providers/trip-data-provider'
import { colors, hardShadow } from '@/lib/colors'
import { GusMenuButton } from '../gallery-ui'
import { expenses, trip } from '../fixtures'
import {
    exercises,
    muscleGroups,
    presets,
    workout,
} from '../health-fixtures'

const noop = () => {}

// Height of the fixed switcher header the page body clears.
const HEADER_HEIGHT = 56

/** Chips grouped by app area; `page` forms render inline as page bodies (the
 *  way the app shows them), `dialog` ones open a MUI Dialog over the page. */
const GROUPS = [
    {
        title: 'Trips',
        forms: [
            { key: 'expense-add', label: 'Expense · add', kind: 'page' },
            { key: 'expense-edit', label: 'Expense · edit', kind: 'page' },
            { key: 'trip-create', label: 'Trip · create', kind: 'page' },
            { key: 'trip-edit', label: 'Trip · edit', kind: 'page' },
            { key: 'delete-expense', label: 'Delete expense', kind: 'dialog' },
            { key: 'delete-trip', label: 'Delete trip', kind: 'dialog' },
        ],
    },
    {
        title: 'Health',
        forms: [
            { key: 'workout-log', label: 'Workout · log', kind: 'page' },
            { key: 'workout-edit', label: 'Workout · edit', kind: 'page' },
            { key: 'workout-dup', label: 'Workout · duplicate', kind: 'page' },
            { key: 'routine-new', label: 'Routine · new', kind: 'page' },
            { key: 'routine-edit', label: 'Routine · edit', kind: 'page' },
        ],
    },
] as const

type FormKey = (typeof GROUPS)[number]['forms'][number]['key']

type FormEntry = { key: FormKey; label: string; kind: 'page' | 'dialog' }
const ALL_FORMS: readonly FormEntry[] = GROUPS.flatMap(
    (g) => g.forms as readonly FormEntry[]
)
const isPageForm = (key: FormKey | null) =>
    ALL_FORMS.find((f) => f.key === key)?.kind === 'page'

export default function FormsGallery() {
    const [selected, setSelected] = useState<FormKey | null>(null)

    const close = () => setSelected(null)

    const pageForm = (() => {
        switch (selected) {
            case 'expense-add':
            case 'expense-edit':
                return (
                    <TripDataProvider trip={trip} expenses={expenses}>
                        <ExpenseForm
                            key={selected}
                            mode={selected === 'expense-add' ? 'add' : 'edit'}
                            expense={
                                selected === 'expense-edit'
                                    ? expenses[0]
                                    : undefined
                            }
                            onCancel={close}
                            onSuccess={close}
                        />
                    </TripDataProvider>
                )
            case 'trip-create':
            case 'trip-edit':
                return (
                    <TripForm
                        key={selected}
                        mode={selected === 'trip-create' ? 'create' : 'edit'}
                        trip={selected === 'trip-edit' ? trip : undefined}
                        onCancel={close}
                        onSuccess={close}
                    />
                )
            case 'workout-log':
            case 'workout-edit':
            case 'workout-dup':
                return (
                    <WorkoutForm
                        key={selected}
                        mode={
                            selected === 'workout-log'
                                ? 'add'
                                : selected === 'workout-edit'
                                  ? 'edit'
                                  : 'duplicate'
                        }
                        workout={selected === 'workout-log' ? undefined : workout}
                        muscleGroups={muscleGroups}
                        exercises={exercises}
                        presets={presets}
                        onCancel={close}
                        onSuccess={close}
                    />
                )
            case 'routine-new':
            case 'routine-edit':
                return (
                    <RoutineForm
                        key={selected}
                        mode={selected === 'routine-new' ? 'add' : 'edit'}
                        preset={selected === 'routine-edit' ? presets[0] : undefined}
                        muscleGroups={muscleGroups}
                        exercises={exercises}
                        onCancel={close}
                        onSuccess={close}
                    />
                )
            default:
                return null
        }
    })()

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: colors.secondaryYellow }}>
            {/* Fixed header with the form switcher. Above MUI Dialog (1300)
                so the chips stay tappable while a dialog is open. */}
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
                {/* Chips — single row, horizontal scroll, grouped by area */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        overflowX: 'auto',
                        flex: 1,
                        py: 1,
                        // room for the hard shadow so it isn't clipped
                        pr: 0.5,
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                    {GROUPS.map((group, gi) => (
                        <Box
                            key={group.title}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexShrink: 0,
                                ...(gi > 0 && {
                                    pl: 1,
                                    borderLeft: `1px solid ${colors.primaryBlack}40`,
                                }),
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    color: colors.primaryBrown,
                                    userSelect: 'none',
                                }}>
                                {group.title}
                            </Typography>
                            {group.forms.map((f) => {
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
                    ))}
                </Box>
            </Box>

            {/* Page body — description when nothing (or a dialog) is open;
                page forms render inline as page bodies, like in the app */}
            {!isPageForm(selected) && (
                <Box sx={{ pt: `${HEADER_HEIGHT + 16}px`, px: 2, pb: 4 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 480 }}>
                        Tap a chip to open that form — the header stays on top, so you can flip
                        directly between forms to compare. Trip forms load dropdown data
                        (categories, users) from the local API — needs a signed-in browser.
                        Health forms run entirely on fixtures. Submitting writes to your local
                        dev DB; the delete buttons are no-ops.
                    </Typography>
                </Box>
            )}

            {pageForm && (
                <Box
                    sx={{
                        pt: `${HEADER_HEIGHT}px`,
                        // Clear the form's fixed PageActionBar (portaled to
                        // body) so the last fields are scrollable. The real app
                        // reserves this via #main-scroll's bottom inset.
                        pb: '140px',
                        display: 'flex',
                        justifyContent: 'center',
                    }}>
                    <Box sx={{ width: '100%', maxWidth: 450 }}>{pageForm}</Box>
                </Box>
            )}

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
