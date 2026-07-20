'use client'

import { cardSx, colors } from '@/lib/colors'
import type { DaysSince, Workout } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { Box, Typography } from '@mui/material'
import { useQueries, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo } from 'react'
import { getTablerIcon } from 'utils/icons'
import { fetchTrips } from 'utils/api'

import DeparturesBoard from 'components/departures-board'
import TrainingGrid, { isoDaysAgo, localDateIso } from 'components/health/training-grid'

/**
 * Matches the health page's own workout window so the two share a query cache
 * entry — landing on /gustavo/health after the home page is then instant. The
 * grid renders 14 days and ignores the rest; if the health page ever changes its
 * range the keys simply stop matching and each fetches its own (no breakage).
 */
const HEALTH_FETCH_DAYS = 30

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    return 'evening'
}

const fetchJson = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)
    return res.json()
}

/**
 * Section heading above each launcher. The cards are elaborate enough that a
 * label inside their own chrome reads as decoration — pulled out here with a
 * chevron, it's unambiguous what tapping through goes to. Both the heading and
 * the card link to the same place.
 */
function SectionTitle({ title, href }: { title: string; href: string }) {
    return (
        <Box
            component={Link}
            href={href}
            sx={{
                'display': 'flex',
                'alignItems': 'baseline',
                'gap': 0.5,
                'marginBottom': 0.75,
                'paddingX': 0.25,
                'textDecoration': 'none',
                'color': colors.primaryBlack,
            }}>
            <Typography
                sx={{
                    fontSize: 19,
                    fontWeight: 600,
                    fontFamily: 'var(--font-serif)',
                    lineHeight: 1.1,
                }}>
                {title}
            </Typography>
            <Box component="span" sx={{ fontSize: 16, lineHeight: 1.1, color: '#8a7f6e' }}>
                ›
            </Box>
        </Box>
    )
}

/**
 * The plain launcher row — the fallback while a card's data loads, and the
 * empty state for Trips. It no longer names the section (the heading above does
 * that); loading shows a placeholder bar rather than a redundant label.
 */
function StatusRow({
    href,
    icon,
    bg,
    label,
    loading = false,
}: {
    href: string
    icon: string
    bg: string
    label: string
    loading?: boolean
}) {
    return (
        <Box
            component={Link}
            href={href}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'gap': 2,
                'padding': 2,
                ...cardSx,
                'textDecoration': 'none',
                'color': colors.primaryBlack,
                '&:active': {
                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                    transform: 'translate(1px, 1px)',
                },
                'transition': 'box-shadow 0.1s, transform 0.1s',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: bg,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                    flexShrink: 0,
                }}>
                {getTablerIcon({
                    name: icon,
                    size: 22,
                    stroke: 1.8,
                    color: colors.primaryBlack,
                    fill: colors.primaryWhite,
                })}
            </Box>
            {loading ? (
                <Box
                    aria-hidden="true"
                    sx={{ height: 12, width: 132, borderRadius: '3px', backgroundColor: '#e6e0d2' }}
                />
            ) : (
                <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{label}</Typography>
            )}
        </Box>
    )
}

/**
 * Trips launcher. Renders the split-flap departures board once the group's own
 * trips are loaded; falls back to the plain row while loading or when there are
 * no trips yet (nothing to flap through).
 */
function TripsSection() {
    const { data: trips = [], isLoading } = useQuery({
        queryKey: queryKeys.trips.list(),
        queryFn: fetchTrips,
    })
    const myTrips = trips.filter((t) => t.userRole !== null)
    const ready = !isLoading && myTrips.length > 0

    return (
        <Box>
            <SectionTitle title="Trips" href="/gustavo/trips" />
            {ready ? (
                <DeparturesBoard trips={myTrips} />
            ) : (
                <StatusRow
                    href="/gustavo/trips"
                    icon="IconPlaneDeparture"
                    bg="#e8edca"
                    label="No trips yet"
                    loading={isLoading}
                />
            )}
        </Box>
    )
}

/**
 * Health launcher. Renders the 14-day training grid; the plain row holds the
 * space while the data loads, since showing an empty grid mid-fetch would claim
 * "no workouts" before that's known. A genuinely empty log gets the grid's own
 * first-run call to action.
 */
function HealthSection() {
    const today = useMemo(() => localDateIso(), [])
    const from = useMemo(() => isoDaysAgo(HEALTH_FETCH_DAYS), [])

    const [daysSinceQ, workoutsQ] = useQueries({
        queries: [
            {
                queryKey: queryKeys.health.workouts.daysSince,
                queryFn: () =>
                    fetchJson<DaysSince[]>(`/api/health/workouts/days-since?today=${today}`),
            },
            {
                queryKey: [
                    ...queryKeys.health.workouts.list(),
                    { startDate: from, endDate: today },
                ],
                queryFn: () =>
                    fetchJson<Workout[]>(
                        `/api/health/workouts?startDate=${from}&endDate=${today}`
                    ),
            },
        ],
    })

    const loading = daysSinceQ.isLoading || workoutsQ.isLoading

    return (
        <Box>
            <SectionTitle title="Health" href="/gustavo/health" />
            {loading ? (
                <StatusRow
                    href="/gustavo/health"
                    icon="IconHeartbeat"
                    bg="#f0b8b4"
                    label="Health"
                    loading
                />
            ) : (
                <TrainingGrid
                    workouts={workoutsQ.data ?? []}
                    daysSince={daysSinceQ.data ?? []}
                    todayIso={today}
                />
            )}
        </Box>
    )
}

export default function GustavoHomePage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                paddingX: 4,
                // Clearance so the Health card doesn't crowd the footer — the
                // grid is a tall card and sat almost flush against it.
                paddingBottom: 4,
            }}>
            {/* Gus Fring avatar */}
            <Box sx={{ paddingBottom: 1, paddingTop: 1 }}>
                <img
                    id="home-gus-avatar"
                    src="/gus-fring.png"
                    alt="Gustavo"
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: '100%',
                        objectFit: 'cover',
                        border: `4px solid ${colors.primaryWhite}`,
                        outline: `3px solid ${colors.primaryBlack}`,
                        boxShadow: `3px 4px 0px ${colors.primaryBlack}`,
                    }}
                />
            </Box>

            {/* Greeting */}
            <Typography
                sx={{
                    fontSize: 20,
                    fontFamily: 'var(--font-serif)',
                    textAlign: 'center',
                    paddingBottom: 3,
                }}>
                Good {getGreeting()}. We have work to do.
            </Typography>

            {/* Launchers — a titled section per app */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5,
                    width: '100%',
                }}>
                <TripsSection />
                <HealthSection />
            </Box>
        </Box>
    )
}
