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
 * one dose back at any time. The page adds an Undo toast after each dose.
 *
 * Between midnight and 6am doses count for the previous day (logDateString);
 * the page passes `nightNote` then, a one-line explainer with a switch.
 *
 * Presentational + gallery-importable: items and the tap handler come in via
 * props (see lib/health/supplement-stack.ts).
 */
import { Box, Typography } from '@mui/material'
import { IconArrowBackUp, IconCheck, IconMoon, IconPill } from '@tabler/icons-react'

import { colors, healthColors, pressRowSx, pressTextSx, toneColors } from '@/lib/colors'
import { isDone, type StackItem } from '@/lib/health/supplement-stack'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import BoardCard, { StripText, stripNumSx, stripWordSx } from './board-card'

/** Hairline between rows — MUI's theme 'divider', which SwipeableRow draws
 *  between rows, so the line above the first row matches the rest. */
const RULE = 'rgba(0, 0, 0, 0.12)'
/** Capsule / meter purple (healthColors.supplements, deepened for fills). */
const FILL = '#8f7bab'
const FILL_LIGHT = '#efe7f6'
const EMPTY_BORDER = '#b7a8c9'
/** Beyond this many doses a day, show "2/5" instead of capsules. */
const MAX_CAPSULES = 4
/** Beyond this many doses in the whole day, the meter is one continuous bar. */
const MAX_SEGMENTS = 24

function Capsules({ item }: { item: StackItem }) {
    const done = isDone(item)
    if (item.dosesPerDay > MAX_CAPSULES) {
        return (
            <Typography
                sx={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: done ? toneColors.positive : colors.primaryBrown,
                    flexShrink: 0,
                }}>
                {Math.min(item.taken, item.dosesPerDay)}/{item.dosesPerDay}
            </Typography>
        )
    }
    return (
        <Box
            sx={{ display: 'flex', gap: '4px', flexShrink: 0 }}
            aria-hidden="true">
            {Array.from({ length: item.dosesPerDay }, (_, i) => (
                <Box
                    key={i}
                    sx={{
                        width: 24,
                        height: 12,
                        borderRadius: 6,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        // Taken: a two-tone capsule; left to take: an empty shell
                        background:
                            i < item.taken
                                ? `linear-gradient(90deg, ${FILL} 50%, ${FILL_LIGHT} 50%)`
                                : colors.primaryWhite,
                        transition: 'background 0.15s',
                    }}
                />
            ))}
        </Box>
    )
}

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
                        border: `1px solid ${i < taken ? '#6f5c8d' : EMPTY_BORDER}`,
                        transition:
                            'background-color 0.15s, border-color 0.15s',
                    }}
                />
            ))}
        </Box>
    )
}

export type NightNote = {
    /** e.g. "Counting for Monday until 6 AM." */
    text: string
    /** The switch, e.g. "Log for Tue". */
    action: string
    onAction: () => void
}

/** Late-night explainer: which day the taps count for, and a switch. Blue
 *  underline = "the app picked this", like the expense form's "Use today?". */
function NightLine({ note }: { note: NightNote }) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
                fontSize: 12,
                lineHeight: 1.3,
                color: colors.primaryBrown,
            }}>
            <IconMoon size={14} stroke={2} style={{ flexShrink: 0 }} />
            <span>{note.text}</span>
            <Box
                component="button"
                type="button"
                onClick={note.onAction}
                sx={{
                    font: 'inherit',
                    fontWeight: 600,
                    color: colors.primaryBlue,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    ...pressTextSx,
                }}>
                {note.action}
            </Box>
        </Box>
    )
}

export default function SupplementsCard({
    items,
    onTap,
    onUndo,
    nightNote,
}: {
    items: StackItem[]
    onTap: (item: StackItem) => void
    /** Take one dose back (swipe left → Undo). */
    onUndo: (item: StackItem) => void
    /** Shown between midnight and 6am — see NightNote. */
    nightNote?: NightNote
}) {
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
                            <Box component="span" sx={{ color: '#6f5c8d' }}>
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
                sx={{
                    marginX: -1.5,
                    marginBottom: -1.5,
                    borderTop: `1px solid ${RULE}`,
                }}>
                {items.map((item, i) => {
                    const done = isDone(item)
                    return (
                        <SwipeableRow
                            key={item.supplementId}
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
                                onClick={() => onTap(item)}
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
                                <Capsules item={item} />
                            </Box>
                        </SwipeableRow>
                    )
                })}
            </Box>
        </BoardCard>
    )
}
