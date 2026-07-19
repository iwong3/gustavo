'use client'

import { cardSx, colors } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import { Box, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getTablerIcon } from 'utils/icons'
import { fetchTrips } from 'utils/api'

import DeparturesBoard from 'components/departures-board'

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    return 'evening'
}

type AppTile = {
    name: string
    href: string
    icon: string
    bg: string
}

const tripsTile: AppTile = {
    name: 'Trips',
    href: '/gustavo/trips',
    icon: 'IconPlaneDeparture',
    bg: '#e8edca',
}

const apps: AppTile[] = [
    {
        name: 'Health',
        href: '/gustavo/health',
        icon: 'IconHeartbeat',
        bg: '#f0b8b4',
    },
]

function AppRow({ app }: { app: AppTile }) {
    return (
        <Box
            component={Link}
            href={app.href}
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
                    backgroundColor: app.bg,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                    flexShrink: 0,
                }}>
                {getTablerIcon({
                    name: app.icon,
                    size: 22,
                    stroke: 1.8,
                    color: colors.primaryBlack,
                    fill: colors.primaryWhite,
                })}
            </Box>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{app.name}</Typography>
        </Box>
    )
}

/**
 * Trips launcher. Renders the split-flap departures board once the group's own
 * trips are loaded; falls back to the plain app row while loading or when there
 * are no trips yet (nothing to flap through).
 */
function TripsBoardCard() {
    const { data: trips = [], isLoading } = useQuery({
        queryKey: queryKeys.trips.list(),
        queryFn: fetchTrips,
    })
    const myTrips = trips.filter((t) => t.userRole !== null)
    if (isLoading || myTrips.length === 0) {
        return <AppRow app={tripsTile} />
    }
    return <DeparturesBoard trips={myTrips} />
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
            }}>
            {/* Gus Fring avatar */}
            <Box sx={{ paddingBottom: 1, paddingTop: 1 }}>
                <img
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
                    paddingBottom: 4,
                }}>
                Good {getGreeting()}. We have work to do.
            </Typography>

            {/* App list — full-width stacked rows */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    width: '100%',
                }}>
                <TripsBoardCard />
                {apps.map((app) => (
                    <AppRow key={app.name} app={app} />
                ))}
            </Box>
        </Box>
    )
}
