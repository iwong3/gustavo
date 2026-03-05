'use client'

import { Box } from '@mui/material'
import Link from 'next/link'

import { ActiveTrips, PastTrips, Trip, toSlug } from 'utils/trips'
import Japan2024Image from '../../../images/japan-2024.jpg'
import Japan2025Image from '../../../images/japan-2025.jpg'
import SouthKorea2025Image from '../../../images/south-korea-2025.jpg'
import Vancouver2024Image from '../../../images/vancouver-2024.jpg'

const getBackgroundImageUrlForTrip = (trip: Trip) => {
    switch (trip) {
        case Trip.Japan2024:
            return Japan2024Image
        case Trip.Vancouver2024:
            return Vancouver2024Image
        case Trip.SouthKorea2025:
            return SouthKorea2025Image
        case Trip.Japan2025:
            return Japan2025Image
        default:
            return ''
    }
}

const TripCard = ({ trip }: { trip: Trip }) => (
    <Box
        component={Link}
        href={`/gustavo/expenses/trips/${toSlug(trip)}`}
        key={'trip-' + trip}
        sx={{
            'display': 'flex',
            'alignItems': 'flex-end',
            'padding': 2,
            'width': '39%',
            'height': typeof window !== 'undefined' ? window.innerHeight * 0.1 : 80,
            'border': '1px solid #FBBC04',
            'borderRadius': '10px',
            'backgroundColor': 'rgba(0, 0, 0, 0.4)',
            'backgroundImage': `url(${getBackgroundImageUrlForTrip(trip)})`,
            'backgroundSize': 'cover',
            'backgroundBlendMode': 'darken',
            'boxShadow': 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
            'color': 'white',
            'fontSize': 18,
            'fontWeight': 'bold',
            'textDecoration': 'none',
            '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
            },
            'transition': 'background-color 0.2s ease-out',
        }}>
        {trip}
    </Box>
)

const TripRow = ({ trips }: { trips: Trip[] }) => {
    const rows = []
    let row: Trip[] = []

    for (let i = 0; i < trips.length; i++) {
        row.push(trips[i])
        if (row.length === 2 || i === trips.length - 1) {
            rows.push(
                <Box
                    key={'trip-row-' + rows.length}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 1,
                        width: '100%',
                    }}>
                    {row.map((t) => (
                        <TripCard key={t} trip={t} />
                    ))}
                </Box>
            )
            row = []
        }
    }

    return <>{rows}</>
}

export default function TripsPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                marginX: 2,
                marginTop: 2,
                width: '100%',
                height: '100%',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 2,
                    width: '100%',
                    fontSize: 24,
                    fontFamily: 'Spectral',
                }}>
                Upcoming Trips
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: 2,
                }}>
                <TripRow trips={ActiveTrips} />
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 2,
                    width: '100%',
                    fontSize: 24,
                    fontFamily: 'Spectral',
                }}>
                Past Trips
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: 2,
                }}>
                <TripRow trips={PastTrips} />
            </Box>
        </Box>
    )
}
