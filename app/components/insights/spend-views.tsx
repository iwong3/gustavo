'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import type { MySpendChartDatum } from 'hooks/useMySpendData'
import { formatUsd } from 'utils/currency'

// The three Insights views, one shape per kind of data: bars for
// categories, a calendar for days, a route for places. Each takes the hook's
// chart data, highlights `selectedKey`, and reports taps via `onSelect`
// (the page toggles the filter). The views span the card's full width (the
// card has no side/bottom padding of its own): each part insets itself, and
// the tappable rows run edge to edge so a selected row's highlight has room
// on all four sides. Values animate to their new sizes when the
// person or filters change — elements are keyed by category/day/place so
// the same bar grows or shrinks rather than being replaced.

type ViewProps = {
    data: MySpendChartDatum[]
    selectedKey: string | null
    onSelect: (key: string) => void
}

const RULE = `1px solid ${colors.primaryBlack}1a`
// Filter rows: the highlight IS the tap feedback, so no pressed tint (phones
// hold :active a beat past a quick tap, which read as the highlight lingering
// after unselecting). Eases in, drops instantly.
const toggleRowSx = (selected: boolean) => ({
    transition: selected ? 'background-color 0.1s' : 'none',
})
// The card's content inset (12px) — applied by each part of a view, since
// the rows run full width
const INSET = 1.5
// Below the last row: its own 6.8px bottom padding + this = the card's 12px
const SAFE_BOTTOM = '5.2px'
const GROW = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
const VALUE_TRANSITION = `width 320ms ${GROW}, opacity 0.15s`

const pct = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0

// ── Category: overview bar + a bar per category ─────────────────────────────

export function CategoryBreakdown({ data, selectedKey, onSelect }: ViewProps) {
    const total = data.reduce((s, d) => s + d.value, 0)
    if (data.length === 0) return <EmptyView />
    return (
        <Box sx={{ paddingBottom: SAFE_BOTTOM }}>
            {/* The whole, split by category */}
            <Box
                sx={{
                    display: 'flex',
                    marginX: INSET,
                    height: 22,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    borderRadius: '3px',
                    overflow: 'hidden',
                }}>
                {data.map((d, i) => (
                    <Box
                        key={d.key}
                        onClick={() => onSelect(d.key)}
                        sx={{
                            width: `${(d.value / total) * 100}%`,
                            backgroundColor: d.color,
                            borderLeft: i > 0 ? `1.5px solid ${colors.primaryBlack}` : 'none',
                            opacity: selectedKey && selectedKey !== d.key ? 0.3 : 1,
                            cursor: 'pointer',
                            transition: VALUE_TRANSITION,
                        }}
                    />
                ))}
            </Box>
            {/* One row per category — its own bar in its own colour, so
                nothing needs matching back to the overview. Full-width rows,
                text inset, equal padding above and below. */}
            <Box sx={{ marginTop: 0.75 }}>
                {data.map((d, i) => {
                    const selected = selectedKey === d.key
                    const share = pct(d.value, total)
                    return (
                        <Box
                            key={d.key}
                            onClick={() => onSelect(d.key)}
                            sx={{
                                ...toggleRowSx(selected),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                paddingX: 1.5,
                                paddingY: 0.85,
                                borderBottom: i < data.length - 1 ? RULE : 'none',
                                cursor: 'pointer',
                                backgroundColor: selected ? `${colors.primaryYellow}40` : 'transparent',
                                opacity: selectedKey && !selected ? 0.45 : 1,
                            }}>
                            <Typography
                                noWrap
                                sx={{ width: '36%', flexShrink: 0, fontSize: 13, fontWeight: selected ? 700 : 500 }}>
                                {d.label}
                            </Typography>
                            <Box
                                sx={{
                                    flex: 1,
                                    height: 8,
                                    borderRadius: '2px',
                                    backgroundColor: `${colors.primaryBlack}0f`,
                                    overflow: 'hidden',
                                }}>
                                <Box
                                    sx={{
                                        width: `${share}%`,
                                        minWidth: share > 0 ? 3 : 0,
                                        height: '100%',
                                        backgroundColor: d.color,
                                        borderRight: share > 0 ? `1px solid ${colors.primaryBlack}` : 'none',
                                        transition: VALUE_TRANSITION,
                                    }}
                                />
                            </Box>
                            <Typography
                                sx={{ width: 32, textAlign: 'right', fontSize: 11.5, color: colors.primaryBrown, fontVariantNumeric: 'tabular-nums' }}>
                                {share}%
                            </Typography>
                            <Typography
                                sx={{ minWidth: 54, textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                {formatUsd(d.value)}
                            </Typography>
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}

// ── Day: trip calendar heat grid ────────────────────────────────────────────

// Spend ramp, lightest → deepest (0 = no spend)
const HEAT = [colors.primaryWhite, `${colors.primaryYellow}66`, colors.primaryYellow, '#e0a44a', '#b3741f']
const heatLevel = (value: number, max: number) =>
    value <= 0.005 || max <= 0 ? 0 : Math.min(4, Math.ceil((value / max) * 4))

export function DayCalendar({ data, selectedKey, onSelect }: ViewProps) {
    if (data.length === 0) return <EmptyView />
    const max = Math.max(...data.map((d) => d.value))
    // Every date from first to last (out-of-trip expense dates can leave
    // gaps) so each cell lands in its real weekday column
    const byKey = new Map(data.map((d) => [d.key, d]))
    const first = dayjs(data[0].key + 'T00:00:00')
    const last = dayjs(data[data.length - 1].key + 'T00:00:00')
    const days: MySpendChartDatum[] = []
    for (let d = first; !d.isAfter(last); d = d.add(1, 'day')) {
        const key = d.format('YYYY-MM-DD')
        days.push(byKey.get(key) ?? { key, label: key, value: 0, color: '' })
    }
    // Pad to the first day's weekday so columns are Sun…Sat
    const leading = first.day()
    return (
        <Box sx={{ paddingX: INSET, paddingBottom: INSET }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                    <Typography
                        key={i}
                        sx={{ fontSize: 9, fontWeight: 700, color: colors.primaryBrown, textAlign: 'center' }}>
                        {w}
                    </Typography>
                ))}
                {Array.from({ length: leading }, (_, i) => (
                    <Box key={`pad-${i}`} />
                ))}
                {days.map((d) => {
                    const date = dayjs(d.key + 'T00:00:00')
                    const level = heatLevel(d.value, max)
                    const selected = selectedKey === d.key
                    const showMonth = date.date() === 1 || d.key === days[0].key
                    return (
                        <Box
                            key={d.key}
                            onClick={level > 0 ? () => onSelect(d.key) : undefined}
                            aria-label={`${date.format('MMM D')}: ${formatUsd(d.value)}`}
                            sx={{
                                aspectRatio: '1',
                                border: `1px solid ${colors.primaryBlack}${level > 0 ? '' : '40'}`,
                                borderRadius: '3px',
                                backgroundColor: HEAT[level],
                                color: level === 4 ? colors.primaryWhite : colors.primaryBlack,
                                // Selection marks sit inside the cell (folded
                                // corner + underlined date) — nothing outside
                                // it for the card's clip to cut off
                                position: 'relative',
                                overflow: 'hidden',
                                borderWidth: selected ? '1.5px' : '1px',
                                opacity: selectedKey && !selected ? 0.55 : 1,
                                cursor: level > 0 ? 'pointer' : 'default',
                                padding: '2px 3px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'background-color 280ms ease, color 280ms ease, opacity 0.15s, transform 0.1s',
                                ...(level > 0 && { '&:active': { transform: 'scale(0.92)' } }),
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    alignSelf: 'flex-start',
                                    // Underline in the text's own colour: black
                                    // on most days, white on the darkest
                                    ...(selected && {
                                        borderBottom: '2.5px solid currentColor',
                                        paddingBottom: '1px',
                                    }),
                                }}>
                                {date.date()}
                            </Typography>
                            {/* Folded corner, like a bookmarked page */}
                            {selected && (
                                <Box
                                    aria-hidden
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        borderTop: `10px solid ${colors.primaryBlack}`,
                                        borderLeft: '10px solid transparent',
                                    }}
                                />
                            )}
                            {showMonth && (
                                <Typography sx={{ fontSize: 7, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase', opacity: 0.8 }}>
                                    {date.format('MMM')}
                                </Typography>
                            )}
                        </Box>
                    )
                })}
            </Box>
            {/* Legend */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, marginTop: 1 }}>
                <Typography sx={{ fontSize: 9.5, color: colors.primaryBrown }}>less</Typography>
                {HEAT.slice(1).map((c) => (
                    <Box key={c} sx={{ width: 14, height: 8, backgroundColor: c, border: `1px solid ${colors.primaryBlack}` }} />
                ))}
                <Typography sx={{ fontSize: 9.5, color: colors.primaryBrown }}>more</Typography>
            </Box>
        </Box>
    )
}

// ── Place: the route, in trip order ─────────────────────────────────────────

const GUTTER = 26
const LINE = `2px dashed ${colors.primaryBlack}`

export function PlaceRoute({ data, selectedKey, onSelect }: ViewProps) {
    if (data.length === 0) return <EmptyView />
    const stops = [...data].sort((a, b) => ((a.firstDate ?? '') < (b.firstDate ?? '') ? -1 : 1))
    const max = Math.max(...data.map((d) => d.value))
    return (
        // Full-width rows like the category list
        <Box sx={{ paddingBottom: SAFE_BOTTOM }}>
            {stops.map((d, i) => {
                const selected = selectedKey === d.key
                // Stop dot scales with spend: 10–20px
                const dot = 10 + Math.round((max > 0 ? d.value / max : 0) * 10)
                return (
                    <Box
                        key={d.key}
                        onClick={() => onSelect(d.key)}
                        sx={{
                            ...toggleRowSx(selected),
                            display: 'flex',
                            alignItems: 'stretch',
                            cursor: 'pointer',
                            paddingX: 1.5,
                            backgroundColor: selected ? `${colors.primaryYellow}40` : 'transparent',
                            opacity: selectedKey && !selected ? 0.45 : 1,
                        }}>
                        {/* Gutter: the dot centred on the stop, the line only
                            between dots — nothing dangles past the ends */}
                        <Box sx={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
                            {i > 0 && (
                                <Box sx={{ position: 'absolute', left: 11, top: 0, height: '50%', borderLeft: LINE }} />
                            )}
                            {i < stops.length - 1 && (
                                <Box sx={{ position: 'absolute', left: 11, top: '50%', bottom: 0, borderLeft: LINE }} />
                            )}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: 12 - dot / 2,
                                    top: `calc(50% - ${dot / 2}px)`,
                                    width: dot,
                                    height: dot,
                                    borderRadius: '50%',
                                    backgroundColor: colors.primaryYellow,
                                    border: `1.5px solid ${colors.primaryBlack}`,
                                    zIndex: 1,
                                    transition: `width 320ms ${GROW}, height 320ms ${GROW}, left 320ms ${GROW}, top 320ms ${GROW}`,
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, paddingY: 0.85 }}>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                                <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, minWidth: 0 }}>
                                    {d.label}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: colors.primaryBrown, flexShrink: 0 }}>
                                    {d.days} {d.days === 1 ? 'day' : 'days'}
                                </Typography>
                                <Typography
                                    sx={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                    {formatUsd(d.value)}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    height: 8,
                                    width: `${max > 0 ? Math.max(4, (d.value / max) * 100) : 0}%`,
                                    backgroundColor: '#e0a44a',
                                    border: `1px solid ${colors.primaryBlack}`,
                                    marginTop: 0.5,
                                    transition: VALUE_TRANSITION,
                                }}
                            />
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}

function EmptyView() {
    return (
        <Typography sx={{ fontSize: 13, color: colors.primaryBrown, textAlign: 'center', paddingY: 2, paddingX: INSET }}>
            Nothing to show yet.
        </Typography>
    )
}
