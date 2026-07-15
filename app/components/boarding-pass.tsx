'use client'

/**
 * BoardingPass — a trip rendered as an airline ticket on the trips page.
 *
 * One anatomy across all three states; only the strip, stats, and stub vary:
 *   - upcoming    slate strip with a departure countdown
 *   - travelling  yellow strip, day counter, journey progress bar, debt pill
 *   - complete    sage strip, passport stamps (debt status + per-country ink)
 *
 * Presentational and gallery-importable: everything comes in via props
 * (`todayIso` pins "today" so gallery specimens are deterministic).
 */
import { Box, Typography } from '@mui/material'
import { IconCheck, IconClock, IconPlaneDeparture } from '@tabler/icons-react'
import Link from 'next/link'

import { colors } from '@/lib/colors'
import { getCountry } from '@/lib/countries'
import type { TripStats, TripSummary } from '@/lib/types'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { formatRelativeTime } from 'utils/time'

// Strip colors per state — same family as the home page app tiles.
const STRIP_SAGE = '#e8edca'
const STRIP_SLATE = '#cdd9e3'
// Debt-stamp inks — vivid enough to read as clear green / red (the brand
// olive-green + maroon go near-black). The green also has to stand off the
// sage stub background it sits on, so it's kept mid-tone, not pale.
const STAMP_RED = '#bb2f22'
const STAMP_GREEN = '#2f7d34'

// Passport-ink palette for the per-country entry stamps. Dedicated saturated
// inks (not the earthy brand palette, which is too low-chroma to read as colour
// once faded) — classic rubber-stamp red / blue / green / violet. Assigned by a
// stable hash of the country code so a country always gets the same ink.
const STAMP_INKS = ['#b23a2e', '#2f6d8f', '#3f7a3a', '#7a4a86']
const inkForCountry = (code: string) => {
    let sum = 0
    for (let i = 0; i < code.length; i++) sum += code.charCodeAt(i)
    return STAMP_INKS[sum % STAMP_INKS.length]
}

export type PassState = 'upcoming' | 'travelling' | 'complete'

export function getPassState(trip: Pick<TripSummary, 'startDate' | 'endDate'>, todayIso: string): PassState {
    if (todayIso < trip.startDate) return 'upcoming'
    if (todayIso > trip.endDate) return 'complete'
    return 'travelling'
}

// --- Date helpers (YYYY-MM-DD strings, local-midnight Dates) ---

const parseDay = (iso: string) => new Date(iso + 'T00:00:00')
const MS_PER_DAY = 86400000

const diffDays = (fromIso: string, toIso: string) =>
    Math.round((parseDay(toIso).getTime() - parseDay(fromIso).getTime()) / MS_PER_DAY)

// Always shows the year, as 2 digits: "Jul 11 – 19, ’26".
const formatDateRange = (start: string, end: string) => {
    const s = parseDay(start)
    const e = parseDay(end)
    const mo = (d: Date) => d.toLocaleString('en-US', { month: 'short' })
    const yr = (d: Date) => `’${String(d.getFullYear()).slice(-2)}`
    const fmt = (d: Date) => `${mo(d)} ${d.getDate()}`
    if (s.getFullYear() !== e.getFullYear()) {
        return `${fmt(s)}, ${yr(s)} – ${fmt(e)}, ${yr(e)}`
    }
    if (s.getMonth() === e.getMonth()) {
        return `${mo(s)} ${s.getDate()} – ${e.getDate()}, ${yr(s)}`
    }
    return `${fmt(s)} – ${fmt(e)}, ${yr(s)}`
}

const shortDay = (iso: string) =>
    parseDay(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()

// --- Money (stats are server-computed; guard anyway per runtime-lies rule) ---

const safeNum = (v: number | null | undefined) => (Number.isFinite(v) ? (v as number) : 0)
const fmtUsdWhole = (n: number) => FormattedMoney('USD', 0).format(safeNum(n))
const fmtUsd = (n: number) => {
    const v = safeNum(n)
    return FormattedMoney('USD', Math.round(v * 100) % 100 === 0 ? 0 : 2).format(v)
}

// --- Shared bits ---

const fieldLabelSx = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    opacity: 0.55,
    marginBottom: '4px',
} as const

const fieldValueSx = {
    fontSize: 13,
    fontWeight: 700,
    minHeight: 24,
    display: 'flex',
    alignItems: 'center',
} as const

function Field({ label, align = 'left', children }: {
    label: string
    align?: 'left' | 'right'
    children: React.ReactNode
}) {
    return (
        <Box sx={{ textAlign: align }}>
            <Typography sx={fieldLabelSx}>{label}</Typography>
            <Box sx={{ ...fieldValueSx, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
                {children}
            </Box>
        </Box>
    )
}

/** Stick figure mid-party — the journey bar's traveller marker. */
function PartyingTraveller({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={colors.primaryBlack} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="4.5" r="2.4" />
            <path d="M12 8v6.5" />
            <path d="M12 10.5 7 6" />
            <path d="M12 10.5 17 6" />
            <path d="M12 14.5 8.5 20" />
            <path d="M12 14.5l3.5 5" />
        </svg>
    )
}

/** Progress through the vacation: date labels bracket a dotted trail with one
 *  tick per day; the traveller rides the yellow fill. */
function JourneyBar({ startDate, endDate, todayIso }: {
    startDate: string
    endDate: string
    todayIso: string
}) {
    const days = Math.max(1, diffDays(startDate, endDate) + 1)
    const dayOfTrip = Math.min(days, Math.max(1, diffDays(startDate, todayIso) + 1))
    const frac = Math.min(1, Math.max(0.04, (dayOfTrip - 0.5) / days))
    const LABEL_W = 38 // room for the date labels at each end

    return (
        <Box sx={{ position: 'relative', height: 30, marginTop: 1.5 }}>
            <Typography sx={{ ...journeyLabelSx, left: 0 }}>{shortDay(startDate)}</Typography>
            <Typography sx={{ ...journeyLabelSx, right: 0 }}>{shortDay(endDate)}</Typography>
            <Box
                sx={{
                    position: 'absolute',
                    left: LABEL_W,
                    right: LABEL_W,
                    top: '50%',
                    borderTop: `2.5px dotted ${colors.primaryBlack}`,
                    opacity: 0.3,
                }}
            />
            {days <= 16 && (
                <Box
                    sx={{
                        position: 'absolute',
                        left: LABEL_W,
                        right: LABEL_W,
                        top: '50%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        zIndex: 1,
                    }}>
                    {Array.from({ length: days }, (_, i) => (
                        <Box
                            key={i}
                            sx={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                backgroundColor: colors.primaryBlack,
                                opacity: 0.5,
                                transform: 'translateY(-50%)',
                            }}
                        />
                    ))}
                </Box>
            )}
            <Box
                sx={{
                    position: 'absolute',
                    left: LABEL_W,
                    top: '50%',
                    height: 7,
                    transform: 'translateY(-52%)',
                    width: `calc((100% - ${LABEL_W * 2}px) * ${frac})`,
                    backgroundColor: colors.primaryYellow,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    borderRadius: 999,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: `calc(${LABEL_W}px + (100% - ${LABEL_W * 2}px) * ${frac})`,
                    transform: 'translate(-50%, -50%)',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: colors.primaryYellow,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    boxShadow: `1.5px 1.5px 0 ${colors.primaryBlack}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                }}>
                <PartyingTraveller size={15} />
            </Box>
        </Box>
    )
}

const journeyLabelSx = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.06em',
    opacity: 0.55,
} as const

/** Rubber-stamp debt status: double border, slight slant, sits in the stub
 *  where a barcode would be. The country stamps are the scattered ones. */
function DebtStamp({ stats }: { stats: TripStats }) {
    const net = safeNum(stats.yourNetUsd)
    const settled = stats.isSettled
    // Only a fully-settled trip is green; any open balance (you owe, you're owed,
    // or others square up between themselves) still needs action, so it reads red.
    const color = settled ? STAMP_GREEN : STAMP_RED
    const text = settled
        ? 'Settled'
        : net < 0
          ? `You owe ${fmtUsd(-net)}`
          : net > 0
            ? `You're owed ${fmtUsd(net)}`
            : 'Debts open' // others owe each other, you're square
    return (
        <Box
            sx={{
                flexShrink: 0,
                transform: 'rotate(-5deg)',
                border: `2px solid ${color}`,
                borderRadius: '5px',
                padding: '2px 3px',
                opacity: 0.9,
            }}>
            <Box
                sx={{
                    border: `1px solid ${color}`,
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    color,
                }}>
                {text}
            </Box>
        </Box>
    )
}

/** Faint circular passport entry stamp — one per country visited. */
function EntryStamp({ code, monthYear, index, color }: {
    code: string
    monthYear: string
    index: number
    color: string
}) {
    return (
        <Box
            sx={{
                position: 'absolute',
                right: 12 + index * 52,
                top: index % 2 === 0 ? 30 : 22,
                width: 58,
                height: 58,
                border: `2px solid ${color}`,
                borderRadius: '50%',
                color,
                opacity: 0.5,
                transform: `rotate(${index % 2 === 0 ? 8 : -6}deg)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1px',
                pointerEvents: 'none',
                zIndex: 1,
            }}>
            <Typography sx={{ fontSize: 6.5 }}>✦</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1 }}>
                {code}
            </Typography>
            <Typography sx={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1 }}>
                {monthYear}
            </Typography>
            <Typography sx={{ fontSize: 6.5 }}>✦</Typography>
        </Box>
    )
}

// --- The pass ---

type BoardingPassProps = {
    trip: TripSummary
    /** Pin "today" (YYYY-MM-DD) — used by the gallery. Defaults to the real date. */
    todayIso?: string
}

export default function BoardingPass({ trip, todayIso }: BoardingPassProps) {
    const today = todayIso ?? new Date().toISOString().slice(0, 10)
    const state = getPassState(trip, today)
    const stats = trip.stats

    const expensesHref = `/gustavo/trips/${trip.slug}/expenses`
    const activityHref = `/gustavo/trips/${trip.slug}/activity`

    const days = Math.max(1, diffDays(trip.startDate, trip.endDate) + 1)
    const dayOfTrip = Math.min(days, Math.max(1, diffDays(trip.startDate, today) + 1))
    const daysUntil = diffDays(today, trip.startDate)

    const strip = {
        upcoming: {
            bg: STRIP_SLATE,
            icon: <IconClock size={13} stroke={2.5} />,
            text: daysUntil === 1 ? 'Departs tomorrow' : `Departs in ${daysUntil} days`,
        },
        travelling: {
            bg: colors.primaryYellow,
            icon: <IconPlaneDeparture size={13} stroke={2.5} />,
            text: `Now travelling · Day ${dayOfTrip} of ${days}`,
        },
        complete: {
            bg: STRIP_SAGE,
            icon: <IconCheck size={13} stroke={2.5} />,
            text: 'Trip complete',
        },
    }[state]

    const net = safeNum(stats?.yourNetUsd)
    // One entry stamp per country, on every trip card (upcoming/travelling/complete).
    const entryCountries = trip.countries
    const stampMonthYear = parseDay(trip.endDate)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        .toUpperCase()

    // Activity footer (upcoming + travelling)
    const latest = stats?.latestExpense
    const activityText = latest
        ? `${latest.byFirstName ?? 'Someone'} added “${latest.name}”${
              latest.reportedAt ? ` · ${formatRelativeTime(latest.reportedAt)}` : ''
          }`
        : state === 'upcoming'
          ? 'No plans logged yet — add the first'
          : 'No expenses yet — add the first'

    const stubSx = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1.25,
        paddingX: 1.75,
        paddingY: 1,
        color: colors.primaryBlack,
        textDecoration: 'none',
        borderRadius: '0 0 7px 7px',
        backgroundColor: strip.bg, // footer matches the header strip
    } as const

    return (
        <Box
            sx={{
                'position': 'relative',
                'width': '100%',
                'border': `1px solid ${colors.primaryBlack}`,
                'borderRadius': '8px',
                'backgroundColor': colors.primaryWhite,
                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                'color': colors.primaryBlack,
                '&:active': {
                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                    transform: 'translate(1px, 1px)',
                },
                'transition': 'box-shadow 0.1s ease-out, transform 0.1s ease-out',
            }}>
            {/* Header strip */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    paddingX: 1.75,
                    paddingY: 0.5,
                    minHeight: 34,
                    backgroundColor: strip.bg,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                    borderRadius: '7px 7px 0 0',
                }}>
                <Typography
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                    }}>
                    {strip.icon}
                    {strip.text}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        opacity: 0.55,
                    }}>
                    Gus Air
                </Typography>
            </Box>

            {/* Body — taps through to the trip's expenses */}
            <Box
                component={Link}
                href={expensesHref}
                sx={{
                    position: 'relative',
                    display: 'block',
                    paddingX: 1.75,
                    paddingTop: 1.25,
                    paddingBottom: 1.5,
                    color: colors.primaryBlack,
                    textDecoration: 'none',
                }}>
                {entryCountries.map((code, i) => (
                    <EntryStamp key={code} code={code} monthYear={stampMonthYear} index={i} color={inkForCountry(code)} />
                ))}

                {/* Name + flags — kept above the stamp ink for legibility */}
                <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 20,
                            fontWeight: 700,
                            lineHeight: 1.15,
                        }}>
                        {trip.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        {trip.countries.map((code) => {
                            const country = getCountry(code)
                            return (
                                <Typography key={code} title={country?.name ?? code} sx={{ fontSize: 17, lineHeight: 1 }}>
                                    {country?.flag ?? code}
                                </Typography>
                            )
                        })}
                    </Box>
                </Box>

                {/* Fields */}
                <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', gap: 2.25, marginTop: 1.25, alignItems: 'flex-start' }}>
                    <Field label="Dates">
                        {formatDateRange(trip.startDate, trip.endDate)}
                    </Field>
                    <Field label="Passengers">
                        <Box sx={{ display: 'flex' }}>
                            {trip.participants.map((p, i) => (
                                <InitialsIcon
                                    key={p.id}
                                    name={p.firstName}
                                    initials={p.initials}
                                    iconColor={p.iconColor}
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        fontSize: 9,
                                        marginLeft: i === 0 ? 0 : '-5px',
                                        zIndex: trip.participants.length - i,
                                        border: `1px solid ${colors.primaryBlack}`,
                                        boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                    }}
                                />
                            ))}
                        </Box>
                    </Field>
                    {state === 'travelling' && stats && (
                        <>
                            <Box sx={{ marginLeft: 'auto' }}>
                                <Field label="Today" align="right">
                                    {fmtUsdWhole(stats.todaySpendUsd)}
                                </Field>
                            </Box>
                            <Field label="Total" align="right">
                                {fmtUsdWhole(stats.totalSpendUsd)}
                            </Field>
                        </>
                    )}
                    {state === 'upcoming' && stats && safeNum(stats.totalSpendUsd) > 0 && (
                        <Box sx={{ marginLeft: 'auto' }}>
                            <Field label="Total" align="right">
                                {fmtUsdWhole(stats.totalSpendUsd)}
                            </Field>
                        </Box>
                    )}
                </Box>

                {/* Journey bar + debt pill */}
                {state === 'travelling' && (
                    <>
                        <JourneyBar startDate={trip.startDate} endDate={trip.endDate} todayIso={today} />
                        {stats && Math.abs(net) >= 0.005 && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 0.75 }}>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        paddingX: 1,
                                        paddingY: '3px',
                                        borderRadius: 999,
                                        border: `1.5px solid ${colors.primaryBlack}`,
                                        boxShadow: `1.5px 1.5px 0 ${colors.primaryBlack}`,
                                        backgroundColor: net > 0 ? STRIP_SAGE : '#f0b8b4',
                                    }}>
                                    {net > 0 ? `You're owed ${fmtUsd(net)}` : `You owe ${fmtUsd(-net)}`}
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* Perforation + stub */}
            {stats && (
                <>
                    <Box sx={{ borderTop: `2px dashed ${colors.primaryBlack}`, opacity: 0.85 }} />
                    {state === 'complete' ? (
                        <Box component={Link} href={expensesHref} sx={stubSx}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                                You spent {fmtUsdWhole(stats.yourShareUsd)} · {stats.expenseCount}{' '}
                                {stats.expenseCount === 1 ? 'expense' : 'expenses'}
                            </Typography>
                            <DebtStamp stats={stats} />
                        </Box>
                    ) : (
                        <Box
                            component={Link}
                            href={latest ? activityHref : expensesHref}
                            sx={stubSx}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, opacity: latest ? 1 : 0.7 }}>
                                {activityText}
                            </Typography>
                            <Typography sx={{ fontWeight: 800, flexShrink: 0 }}>→</Typography>
                        </Box>
                    )}
                </>
            )}

        </Box>
    )
}
