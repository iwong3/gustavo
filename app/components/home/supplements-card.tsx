'use client'

/**
 * SupplementsCard — the home page's daily stack check-off, in a
 * departures-board frame (BoardCard) whose pill counts today's doses.
 *
 * Under the header, a segmented day meter: one segment per dose across the
 * whole stack, filling as you go. Then one plain row per supplement with a
 * capsule per daily dose; tap the row to take a dose and a capsule fills in.
 * Tapping a finished row takes the last dose back (so a 1×-a-day item
 * behaves like a checkbox); swiping any row left reveals Undo, which takes
 * one dose back at any time. No Undo toast here — it covered the bottom
 * rows and ate quick taps meant for them.
 *
 * Between midnight and 6am doses count for the previous day (logDateString);
 * the page passes `nightNote` then, a one-line explainer with a switch.
 *
 * Rows reorder by drag (`onReorder`): press-and-hold then drag on touch, or
 * just drag with a mouse. The hold keeps taps, swipes and scrolling as they
 * were; while a row is lifted the list swallows touchmove (capture phase) so
 * SwipeableRow and pull-to-refresh yield, and the click that ends a drag
 * never takes a dose.
 *
 * Presentational + gallery-importable: items and the tap handler come in via
 * props (see lib/health/supplement-stack.ts).
 */
import { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { IconArrowBackUp, IconCheck, IconPill } from '@tabler/icons-react'
import {
    closestCenter,
    DndContext,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { colors, healthColors, pressRowSx, supplementColors, toneColors } from '@/lib/colors'
import { isDone, type StackItem } from '@/lib/health/supplement-stack'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { Capsules } from 'components/health/supplements/capsules'
import { NightLine, type NightNote } from 'components/health/supplements/night-line'
import BoardCard, { StripText, stripNumSx, stripWordSx } from './board-card'

/** Hairline between rows — MUI's theme 'divider', which SwipeableRow draws
 *  between rows, so the line above the first row matches the rest. */
const RULE = 'rgba(0, 0, 0, 0.12)'
const { fill: FILL, fillLight: FILL_LIGHT, edge: EMPTY_BORDER, deep: DEEP } = supplementColors
/** Beyond this many doses in the whole day, the meter is one continuous bar. */
const MAX_SEGMENTS = 24

/** Every dose in the day as a segment; one bar when there are too many. */
function DayMeter({ taken, total }: { taken: number; total: number }) {
    if (total > MAX_SEGMENTS) {
        return (
            <Box
                sx={{
                    height: 8,
                    borderRadius: '2px',
                    border: `1px solid ${EMPTY_BORDER}`,
                    background: `linear-gradient(90deg, ${FILL} ${(taken / total) * 100}%, ${FILL_LIGHT} 0)`,
                }}
            />
        )
    }
    return (
        <Box sx={{ display: 'flex', gap: '3px' }} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
                <Box
                    key={i}
                    sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: '2px',
                        backgroundColor: i < taken ? FILL : FILL_LIGHT,
                        border: `1px solid ${i < taken ? DEEP : EMPTY_BORDER}`,
                        transition:
                            'background-color 0.15s, border-color 0.15s',
                    }}
                />
            ))}
        </Box>
    )
}

/** A row that lifts and follows the pointer vertically while dragged. */
function SortableStackRow({ id, children }: { id: number; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <Box
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            // Long-press would otherwise open the browser's context menu
            onContextMenu={(e) => e.preventDefault()}
            sx={{
                position: 'relative',
                // Vertical only — a list reorder, never a sideways slide
                transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
                transition,
                zIndex: isDragging ? 10 : 'auto',
                boxShadow: isDragging ? `2px 2px 0px ${colors.primaryBlack}` : 'none',
                outline: isDragging ? `1px solid ${colors.primaryBlack}` : 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                cursor: isDragging ? 'grabbing' : undefined,
            }}>
            {children}
        </Box>
    )
}

export default function SupplementsCard({
    items,
    onTap,
    onUndo,
    onReorder,
    nightNote,
}: {
    items: StackItem[]
    onTap: (item: StackItem) => void
    /** Take one dose back (swipe left → Undo). */
    onUndo: (item: StackItem) => void
    /** New stack order (supplement ids) after a drag. */
    onReorder?: (supplementIds: number[]) => void
    /** Shown between midnight and 6am — see NightNote. */
    nightNote?: NightNote
}) {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    )
    const draggingRef = useRef(false)
    // Just after a drag: the click that ends it isn't a dose tap
    const justDragged = useRef(false)
    const listRef = useRef<HTMLDivElement>(null)

    // While a row is lifted, own the touch: stops page scroll, and capture
    // phase marks it defaultPrevented before SwipeableRow / pull-to-refresh
    useEffect(() => {
        const el = listRef.current
        if (!el) return
        const onMove = (e: TouchEvent) => {
            if (draggingRef.current && e.cancelable) e.preventDefault()
        }
        el.addEventListener('touchmove', onMove, { passive: false, capture: true })
        return () => el.removeEventListener('touchmove', onMove, { capture: true })
    }, [])

    const setDrag = (on: boolean) => {
        draggingRef.current = on
        if (on) justDragged.current = true
        else setTimeout(() => (justDragged.current = false), 400)
    }
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setDrag(false)
        if (!onReorder || !over || active.id === over.id) return
        const ids = items.map((i) => i.supplementId)
        const from = ids.findIndex((id) => String(id) === String(active.id))
        const to = ids.findIndex((id) => String(id) === String(over.id))
        if (from !== -1 && to !== -1) onReorder(arrayMove(ids, from, to))
    }
    const tap = (item: StackItem) => {
        if (justDragged.current) return
        onTap(item)
    }

    const total = items.reduce((n, i) => n + i.dosesPerDay, 0)
    const taken = items.reduce(
        (n, i) => n + Math.min(i.taken, i.dosesPerDay),
        0
    )
    const allDone = taken >= total

    return (
        <BoardCard
            href="/gustavo/health/supplements"
            headerBg={healthColors.supplements}
            icon={<IconPill size={14} stroke={2.3} />}
            title="Supplements"
            right={
                allDone ? (
                    <StripText label="All doses taken today">
                        <Box
                            component="span"
                            sx={{
                                ...stripWordSx,
                                color: toneColors.positive,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}>
                            <IconCheck size={13} stroke={2.8} />
                            All done
                        </Box>
                    </StripText>
                ) : (
                    <StripText label={`${taken} of ${total} doses taken today`}>
                        <Box component="span" sx={stripNumSx}>
                            <Box component="span" sx={{ color: DEEP }}>
                                {taken}
                            </Box>
                            {/* A spaced, muted slash — like the dot between
                                ON and OFF on the Workouts card */}
                            <Box
                                component="span"
                                aria-hidden="true"
                                sx={{ color: '#a8865a', marginX: '4px' }}>
                                /
                            </Box>
                            <Box
                                component="span"
                                sx={{ color: colors.primaryBlack }}>
                                {total}
                            </Box>
                        </Box>
                        <Box component="span" sx={stripWordSx}>
                            Doses
                        </Box>
                    </StripText>
                )
            }>
            {nightNote && <NightLine note={nightNote} />}
            <DayMeter taken={taken} total={total} />

            {/* One plain row per supplement. Tap to take a dose; swipe left to
                reveal Undo (the app's SwipeableRow, like "Undo payment" on
                Debts) — a lasting way to take one back, not just the toast.
                Bleeds to the card edges so the revealed button meets them. */}
            <Box
                ref={listRef}
                sx={{
                    marginX: -1.5,
                    marginBottom: -1.5,
                    borderTop: `1px solid ${RULE}`,
                }}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={() => setDrag(true)}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => setDrag(false)}>
                <SortableContext
                    items={items.map((i) => i.supplementId)}
                    strategy={verticalListSortingStrategy}
                    disabled={!onReorder}>
                {items.map((item, i) => {
                    const done = isDone(item)
                    return (
                        <SortableStackRow key={item.supplementId} id={item.supplementId}>
                        <SwipeableRow
                            canEdit={false}
                            canDelete={item.taken > 0}
                            onEdit={() => {}}
                            onDelete={() => onUndo(item)}
                            deleteLabel="Undo"
                            deleteIcon={
                                <IconArrowBackUp
                                    size={22}
                                    color={colors.primaryWhite}
                                />
                            }
                            backgroundColor={colors.primaryWhite}
                            showBottomBorder={i < items.length - 1}
                            borderColor={RULE}>
                            <Box
                                component="button"
                                type="button"
                                onClick={() => tap(item)}
                                aria-label={`${item.name}: ${Math.min(item.taken, item.dosesPerDay)} of ${item.dosesPerDay} taken`}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    width: '100%',
                                    minHeight: 40,
                                    paddingX: 1.75,
                                    paddingY: 0.75,
                                    font: 'inherit',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: done
                                        ? colors.primaryBrown
                                        : colors.primaryBlack,
                                    ...pressRowSx,
                                }}>
                                <Typography
                                    sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        fontSize: 13.5,
                                        lineHeight: 1.25,
                                        overflowWrap: 'anywhere',
                                    }}>
                                    {item.name}
                                </Typography>
                                <Capsules taken={item.taken} dosesPerDay={item.dosesPerDay} />
                            </Box>
                        </SwipeableRow>
                        </SortableStackRow>
                    )
                })}
                </SortableContext>
                </DndContext>
            </Box>
        </BoardCard>
    )
}
