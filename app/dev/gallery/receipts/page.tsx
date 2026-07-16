'use client'

import { Box, Typography } from '@mui/material'
import { useState } from 'react'

import { cardSx } from '@/lib/colors'
import { ExpenseRow } from 'components/receipts/expense-row'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { ReceiptsListSkeleton } from 'components/receipts/receipts-list-skeleton'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { PullToRefresh } from 'components/pull-to-refresh'
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

            <SpecimenGroup title="SwipeableRow — drag to full button reveal fires the action">
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
                    <ReceiptsListSkeleton />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
