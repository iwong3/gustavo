'use client'

import { Box, Button, Typography } from '@mui/material'
import { useState } from 'react'

import { cardSx } from '@/lib/colors'
import { ExpenseRow } from 'components/receipts/expense-row'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { ExpensesPageSkeleton } from 'components/skeleton/trip-skeletons'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { PullToRefresh } from 'components/pull-to-refresh'
import { GoneState } from 'components/gone-state'
import { ToastHost } from 'components/toast-host'
import { showToast } from 'components/toast-store'
import { secondaryButtonSx } from '@/lib/form-styles'
import { deleteErrorMessage } from 'utils/delete-error'
import { GalleryPage, SpecimenGroup, Specimen } from '../gallery-ui'
import { expenses } from '../fixtures'

const noop = () => {}

export default function ReceiptsGallery() {
    const [collapsed, setCollapsed] = useState(false)
    const [lastAction, setLastAction] = useState('none')
    const [usd, jpy, longName, error, ramen, donki] = expenses

    return (
        <GalleryPage title="Receipts">
            <SpecimenGroup title="ExpenseRow">
                <Specimen label="default (USD) — no place, falls back to trip location">
                    <ExpenseRow expense={usd} onTap={noop} />
                </Specimen>
                <Specimen label="foreign currency (JPY)">
                    <ExpenseRow expense={jpy} onTap={noop} />
                </Specimen>
                <Specimen label="with place — area reads “Shibuya, Tokyo”, not the street">
                    <ExpenseRow expense={ramen} onTap={noop} />
                </Specimen>
                <Specimen label="pre-00039 place — no components, falls back to trip location">
                    <ExpenseRow expense={donki} onTap={noop} />
                </Specimen>
                <Specimen label="long name — truncation">
                    <ExpenseRow expense={longName} onTap={noop} />
                </Specimen>
                <Specimen label="conversion error — area collapses to one level (“Kyoto”)">
                    <ExpenseRow expense={error} onTap={noop} />
                </Specimen>
                <Specimen label="hideDate (grouped view)">
                    <ExpenseRow expense={usd} onTap={noop} hideDate />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="SwipeableRow — swipe reveals Edit/Delete, tap the button to fire">
                <Specimen label="inside pull-to-refresh — horizontal swipe must not shift the body">
                    <PullToRefresh onRefresh={() => new Promise((r) => setTimeout(r, 800))}>
                        <Box id="swipe-specimen" sx={{ ...cardSx, overflow: 'hidden' }}>
                            {[usd, jpy].map((exp, i) => (
                                <SwipeableRow
                                    key={exp.id}
                                    canEdit
                                    canDelete
                                    onEdit={() => setLastAction(`edit #${exp.id}`)}
                                    onDelete={() => setLastAction(`delete #${exp.id}`)}
                                    showBottomBorder={i === 0}
                                >
                                    <ExpenseRow expense={exp} onTap={noop} />
                                </SwipeableRow>
                            ))}
                        </Box>
                    </PullToRefresh>
                    <Typography sx={{ mt: 1, fontSize: 12 }}>
                        last action: <span id="swipe-last-action">{lastAction}</span>
                    </Typography>
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="DateGroupHeader">
                <Specimen label={`interactive — ${collapsed ? 'collapsed' : 'expanded'} (click)`}>
                    <DateGroupHeader
                        date="2026-07-04"
                        dayTotal={247}
                        dayNumber={3}
                        totalDays={10}
                        expenseCount={4}
                        collapsed={collapsed}
                        onToggle={() => setCollapsed((c) => !c)}
                    />
                </Specimen>
                <Specimen label="outside trip range (no day label)">
                    <DateGroupHeader
                        date="2026-06-30"
                        dayTotal={89}
                        dayNumber={null}
                        totalDays={null}
                        expenseCount={1}
                        collapsed={false}
                        onToggle={noop}
                    />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Loading skeleton">
                <Specimen label="shown inside a trip while expenses load">
                    <ExpensesPageSkeleton />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Feedback — missing-record state, error toast">
                <Specimen label="GoneState — deleted record (expense detail / trip)">
                    <GoneState
                        title="This expense isn't here anymore"
                        detail="It may have been deleted."
                        action={{ label: 'Back to expenses', onClick: noop }}
                    />
                </Specimen>
                <Specimen label="GoneState — load failure with retry">
                    <GoneState
                        title="Couldn't load this trip"
                        detail="Check your connection and try again."
                        action={{ label: 'Try again', onClick: noop }}
                        secondaryAction={{ label: 'Back to trips', onClick: noop }}
                    />
                </Specimen>
                <Specimen label="toast — tap to fire (shows above the tab bar, 4s)">
                    <Button
                        id="toast-trigger"
                        onClick={() => showToast(deleteErrorMessage(new TypeError('offline'), 'expense'))}
                        sx={secondaryButtonSx}>
                        Show error toast
                    </Button>
                    <ToastHost />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
