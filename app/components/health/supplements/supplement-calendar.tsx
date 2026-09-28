'use client'

import { Box, Typography } from '@mui/material'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { memo } from 'react'

import { colors, healthColors, pressShadowSx, supplementColors } from '@/lib/colors'
import type { DaySummary } from '@/lib/health/supplement-calendar'
import { STRIP_H, stripNumSx, stripWordSx } from 'components/home/board-card'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM' → its days as ISO dates, with Monday-first leading blanks. */
function monthCells(month: string): (string | null)[] {
    const [y, m] = month.split('-').map(Number)
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const count = new Date(y, m, 0).getDate()
    const cells: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= count; d++) cells.push(`${month}-${pad(d)}`)
    while (cells.length % 7) cells.push(null)
    return cells
}

/** Monday-first column (0–6) of an ISO date — where the day panel's tab points. */
export const weekdayColumn = (date: string) => (new Date(date + 'T00:00:00').getDay() + 6) % 7

export const monthLabel = (month: string) =>
    new Date(month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

/**
 * One month of your stack, in the Home card's board frame: a purple strip
 * with the month, its score ("24 / 27 FULL" — days you took everything, of
 * the days something was due) and the arrows; then the days, each filled by
 * how much you took (full / partial / dashed = nothing; plain = nothing was
 * due), badged when the stack changed (+ added, − removed, ± both or a dose
 * change). Tap a day to open it below, again to close. Future days are inert.
 * Presentational — summaries come from supplement-calendar.ts.
 */
export function SupplementCalendar({
    month,
    summaryOn,
    today,
    selected,
    onSelect,
    onPrevMonth,
    onNextMonth,
}: {
    month: string
    summaryOn: (date: string) => DaySummary
    today: string
    selected: string | null
    onSelect: (date: string | null) => void
    /** Undefined = no earlier/later month to show. */
    onPrevMonth?: () => void
    onNextMonth?: () => void
}) {
    const cells = monthCells(month)
    const summaries = new Map<string, DaySummary>()
    for (const date of cells) if (date && date <= today) summaries.set(date, summaryOn(date))
    // Today counts once it's complete — an unfinished day isn't a miss yet
    const scored = Array.from(summaries.entries())
        .filter(([date, s]) => s.due > 0 && (date < today || s.status === 'full'))
        .map(([, s]) => s)
    const full = scored.filter((s) => s.status === 'full').length

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    minHeight: STRIP_H,
                    paddingLeft: 1.75,
                    paddingRight: 0.75,
                    backgroundColor: healthColors.supplements,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                }}>
                <Typography
                    sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {monthLabel(month)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {scored.length > 0 && (
                        <Typography
                            component="span"
                            aria-label={`${full} of ${scored.length} days complete`}
                            sx={{ display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1, marginRight: 0.5 }}>
                            <Box component="span" sx={{ ...stripNumSx, color: supplementColors.deep }}>
                                {full}
                            </Box>
                            <Box component="span" sx={{ ...stripNumSx, color: '#a8865a', marginX: '2px' }}>
                                /
                            </Box>
                            <Box component="span" sx={stripNumSx}>
                                {scored.length}
                            </Box>
                            <Box component="span" sx={stripWordSx}>
                                FULL
                            </Box>
                        </Typography>
                    )}
                    <MonthArrow label="Previous month" onClick={onPrevMonth}>
                        <IconChevronLeft size={15} stroke={2.4} />
                    </MonthArrow>
                    <MonthArrow label="Next month" onClick={onNextMonth}>
                        <IconChevronRight size={15} stroke={2.4} />
                    </MonthArrow>
                </Box>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px',
                    padding: 1.5,
                }}>
                {WEEKDAYS.map((d, i) => (
                    <Typography
                        key={i}
                        sx={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1, color: colors.primaryBrown, textAlign: 'center' }}>
                        {d}
                    </Typography>
                ))}
                {cells.map((date, i) =>
                    date ? (
                        <DayCell
                            key={date}
                            date={date}
                            summary={summaries.get(date) ?? null}
                            isToday={date === today}
                            isSelected={date === selected}
                            onSelect={onSelect}
                        />
                    ) : (
                        <Box key={`blank-${i}`} />
                    )
                )}
            </Box>
        </Box>
    )
}

function MonthArrow({
    label,
    onClick,
    children,
}: {
    label: string
    onClick?: () => void
    children: React.ReactNode
}) {
    return (
        <Box
            component="button"
            type="button"
            aria-label={label}
            disabled={!onClick}
            onClick={onClick}
            sx={{
                width: 24,
                height: 24,
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                cursor: onClick ? 'pointer' : 'default',
                color: colors.primaryBlack,
                backgroundColor: colors.primaryWhite,
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '3px',
                boxShadow: onClick ? `1px 1px 0px ${colors.primaryBlack}` : 'none',
                opacity: onClick ? 1 : 0.35,
                ...(onClick ? pressShadowSx : {}),
            }}>
            {children}
        </Box>
    )
}

const { fill, fillLight, edge, deep } = supplementColors

const DayCell = memo(function DayCell({
    date,
    summary,
    isToday,
    isSelected,
    onSelect,
}: {
    date: string
    /** null = a future day. */
    summary: DaySummary | null
    isToday: boolean
    isSelected: boolean
    onSelect: (date: string | null) => void
}) {
    const status = summary?.status ?? 'idle'
    // Every look keeps a 1px border, so selecting a day never resizes it —
    // the selected ring is an inset shadow
    const look = isSelected
        ? {
              background: colors.primaryYellow,
              borderColor: colors.primaryBlack,
              boxShadow: `inset 0 0 0 1px ${colors.primaryBlack}`,
              color: colors.primaryBlack,
          }
        : status === 'full'
          ? { background: fill, borderColor: deep, color: colors.primaryWhite }
          : status === 'part'
            ? {
                  background: `linear-gradient(to top, ${fill} 55%, ${fillLight} 55%)`,
                  borderColor: deep,
                  color: colors.primaryBlack,
              }
            : status === 'none'
              ? { background: colors.primaryWhite, borderColor: edge, borderStyle: 'dashed', color: colors.primaryBrown }
              : { background: 'transparent', borderColor: 'transparent', color: colors.primaryBrown }
    return (
        <Box
            component="button"
            type="button"
            disabled={!summary}
            onClick={() => onSelect(isSelected ? null : date)}
            aria-label={date}
            aria-pressed={isSelected}
            sx={{
                'position': 'relative',
                'height': 32,
                'padding': 0,
                'border': '1px solid',
                'borderRadius': '4px',
                'font': 'inherit',
                'fontSize': 11,
                'fontWeight': 600,
                'fontVariantNumeric': 'tabular-nums',
                'cursor': summary ? 'pointer' : 'default',
                'opacity': summary ? 1 : 0.45,
                'outline': isToday ? `2px solid ${colors.primaryBlack}` : 'none',
                'outlineOffset': '1px',
                ...look,
                '&:active': summary ? { transform: 'scale(0.94)' } : {},
                'transition': 'transform 0.1s',
            }}>
            {Number(date.slice(8))}
            {summary?.badge && (
                <Box
                    component="span"
                    aria-label="Stack changed"
                    sx={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        lineHeight: 1,
                        color: colors.primaryBlack,
                        backgroundColor: summary.badge === '−' ? colors.primaryWhite : colors.primaryYellow,
                        border: `1.2px solid ${colors.primaryBlack}`,
                        zIndex: 1,
                    }}>
                    {summary.badge}
                </Box>
            )}
        </Box>
    )
})
