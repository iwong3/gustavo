'use client'

// "Where We've Been" — thin data wrapper around the presentational <TripsMap>.
// Fetches the city aggregation; the map component owns rendering + the static
// country-outline load. Deferred (noted, not built): tap a city dot to list the
// trips that hit it — TripMapCity already carries `trips` for exactly this.

import { Box } from '@mui/material'
import { useQuery } from '@tanstack/react-query'

import { queryKeys, staleTimes } from '@/lib/query-keys'
import { TripsMap } from 'components/trips-map'
import { fetchTripMap } from 'utils/api'

const EMPTY_SUMMARY = { cityCount: 0, placeCount: 0, countryCount: 0, tripCount: 0 }

export default function TripsMapPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: queryKeys.trips.map(),
        queryFn: fetchTripMap,
        staleTime: staleTimes.medium,
    })

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                // Tighter than other pages so the map runs close to the edges.
                paddingX: 1.5,
                paddingY: 2,
                width: '100%',
                maxWidth: 720,
                // Fill the scroll area so the map becomes a tall canvas, not a strip.
                height: '100%',
                minHeight: 0,
            }}>
            <TripsMap
                cities={data?.cities ?? []}
                places={data?.places ?? []}
                summary={data?.summary ?? EMPTY_SUMMARY}
                isLoading={isLoading}
                isError={isError}
            />
        </Box>
    )
}
