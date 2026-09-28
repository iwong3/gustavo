'use client'

import { Box, Typography } from '@mui/material'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { memo } from 'react'

import { colors, pressIconSx, supplementColors } from '@/lib/colors'
import type { DaySummary } from '@/lib/health/supplement-calendar'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM' → its days as ISO dates, with Monday-first leading blanks. */
function monthCells(month: string): (string | null)[] {
    const [y, m] = month.split('-').map(Number)
    const first = new Date(y, m - 1, 1)
    const lead = (first.getDay() + 6) % 7
    const count = new Date(y, m, 0).getDate()
    const cells: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= count; d++) cells.push(`${month}-${pad(d)}`)
    while (cells.length % 7) cells.push(null)
    return cells
}

export const monthLabel = (month: string) =>
    new Date(month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

/**
 * One month of your stack: each day filled by how much of it you took
 * (full / partial / dashed = nothing; plain = nothing was due), with a badge
 * when the stack changed that day (+ added, − removed, ± both or a dose
 * change). Tap a day to open it below; tap it again to close. Future days
 * are inert. Presentational — summaries come from supplement-calendar.ts.
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
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: colors.primaryBlack,
                    }}>
                    {monthLabel(month)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <MonthArrow label="Previous month" onClick={onPrevMonth}>
                        <IconChevronLeft size={16} stroke={2.2} />
                    </MonthArrow>
                    <MonthArrow label="Next month" onClick={onNextMonth}>
                        <IconChevronRight size={16} stroke={2.2} />
                    </MonthArrow>
                </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {WEEKDAYS.map((d, i) => (
                    <Typography
                        key={i}
                        sx={{ fontSize: 9.5, fontWeight: 700, color: colors.primaryBrown, textAlign: 'center' }}>
                        {d}
                    </Typography>
                ))}
                {monthCells(month).map((date, i) =>
                    date ? (
                        <DayCell
                            key={date}
                            date={date}
                            summary={date > today ? null : summaryOn(date)}
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
                width: 30,
                height: 30,
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                cursor: onClick ? 'pointer' : 'default',
                color: colors.primaryBlack,
                backgroundColor: colors.primaryWhite,
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '4px',
                opacity: onClick ? 1 : 0.3,
                ...(onClick ? pressIconSx : {}),
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
    const look = isSelected
        ? { background: colors.primaryYellow, border: `1.5px solid ${colors.primaryBlack}`, color: colors.primaryBlack }
        : status === 'full'
          ? { background: fill, border: `1px solid ${deep}`, color: colors.primaryWhite }
          : status === 'part'
            ? { background: `linear-gradient(to top, ${fill} 55%, ${fillLight} 55%)`, border: `1px solid ${deep}`, color: colors.primaryBlack }
            : status === 'none'
              ? { background: colors.primaryWhite, border: `1px dashed ${edge}`, color: colors.primaryBrown }
              : { background: 'transparent', border: '1px solid transparent', color: colors.primaryBrown }
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
                'borderRadius': '4px',
                'font': 'inherit',
                'fontSize': 11,
                'fontWeight': 600,
                'fontVariantNumeric': 'tabular-nums',
                'cursor': summary ? 'pointer' : 'default',
                'opacity': summary ? 1 : 0.45,
                'boxShadow': isSelected ? `2px 2px 0px ${colors.primaryBlack}` : 'none',
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
