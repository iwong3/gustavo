'use client'

/** Gallery specimens for the boarding-pass trip cards — every state + edge cases. */
import { Box } from '@mui/material'

import BoardingPass from 'components/boarding-pass'
import BoardingPassSkeleton from 'components/boarding-pass-skeleton'
import DeparturesBoard from 'components/departures-board'
import { TripsMap } from 'components/trips-map'
import type { TripMapCity, TripMapSummary } from '@/lib/trip-map'

import { GALLERY_TODAY, makePassTrip, makeTripStats } from '../fixtures'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

// Where-we've-been map fixtures — a spread of real cities so the projection,
// dots, and land outlines can be eyeballed without auth or a populated DB.
const mapCity = (
    city: string,
    countryCode: string,
    lat: number,
    lng: number,
    spend: number,
    tripIds: string[]
): TripMapCity => ({
    key: `${countryCode}|${city.toLowerCase()}`,
    city,
    countryCode,
    lat,
    lng,
    totalSpendUsd: spend,
    placeCount: 1,
    trips: tripIds.map((id) => ({
        id,
        name: `Trip ${id}`,
        slug: `trip-${id}`,
        startDate: `2025-0${(Number(id) % 9) + 1}-03`,
        endDate: `2025-0${(Number(id) % 9) + 1}-12`,
        spendUsd: Math.round(spend / tripIds.length),
    })),
})

const tripMapCities: TripMapCity[] = [
    mapCity('Tokyo', 'JP', 35.68, 139.76, 1240, ['1', '2']),
    mapCity('Osaka', 'JP', 34.69, 135.5, 620, ['2']),
    mapCity('Kyoto', 'JP', 35.01, 135.77, 410, ['2']),
    mapCity('Seoul', 'KR', 37.57, 126.98, 530, ['3']),
    mapCity('Taipei', 'TW', 25.03, 121.57, 380, ['4']),
    mapCity('Bangkok', 'TH', 13.75, 100.5, 470, ['5']),
    mapCity('Chiang Mai', 'TH', 18.79, 98.98, 210, ['5']),
    mapCity('Singapore', 'SG', 1.35, 103.82, 640, ['5']),
    mapCity('Bali', 'ID', -8.65, 115.22, 350, ['5']),
    mapCity('Sydney', 'AU', -33.87, 151.21, 720, ['6']),
    mapCity('Paris', 'FR', 48.86, 2.35, 980, ['7']),
    mapCity('Lisbon', 'PT', 38.72, -9.14, 430, ['7']),
    mapCity('London', 'GB', 51.51, -0.13, 810, ['7']),
    mapCity('New York', 'US', 40.71, -74.01, 1120, ['8']),
    mapCity('Mexico City', 'MX', 19.43, -99.13, 360, ['8']),
]

// Finer than cities — individual venues (some cities have several) so the
// Cities/Places toggle visibly changes the dot set.
const tripMapPlaces: TripMapCity[] = [
    mapCity('Ichiran Shibuya', 'JP', 35.661, 139.7, 620, ['1', '2']),
    mapCity('Uobei Sushi', 'JP', 35.682, 139.77, 380, ['2']),
    mapCity('Tsukiji Outer Market', 'JP', 35.665, 139.77, 240, ['2']),
    mapCity('Dotonbori Kukuru', 'JP', 34.669, 135.501, 360, ['2']),
    mapCity('Osaka Ramen Bar', 'JP', 34.702, 135.496, 260, ['2']),
    mapCity('Nishiki Market', 'JP', 35.005, 135.765, 410, ['2']),
    mapCity('Myeongdong Kyoja', 'KR', 37.563, 126.985, 530, ['3']),
    mapCity('Din Tai Fung 101', 'TW', 25.033, 121.564, 380, ['4']),
    mapCity('Raan Jay Fai', 'TH', 13.752, 100.506, 300, ['5']),
    mapCity('Thipsamai', 'TH', 13.751, 100.502, 170, ['5']),
    mapCity('Khao Soi Nimman', 'TH', 18.796, 98.967, 210, ['5']),
    mapCity('Maxwell Food Centre', 'SG', 1.28, 103.844, 640, ['5']),
    mapCity('Warung Bali', 'ID', -8.65, 115.216, 350, ['5']),
    mapCity('Opera Cafe', 'FR', 48.871, 2.331, 560, ['7']),
    mapCity('Le Comptoir', 'FR', 48.851, 2.339, 420, ['7']),
    mapCity('Time Out Market', 'PT', 38.707, -9.146, 430, ['7']),
    mapCity('Borough Market', 'GB', 51.505, -0.091, 810, ['7']),
    mapCity('Katz Deli', 'US', 40.722, -73.987, 720, ['8']),
    mapCity('Joe Pizza', 'US', 40.73, -74.002, 400, ['8']),
    mapCity('El Moro Churreria', 'MX', 19.427, -99.14, 360, ['8']),
]

const tripMapSummary: TripMapSummary = {
    cityCount: tripMapCities.length,
    placeCount: tripMapPlaces.length,
    countryCount: new Set(tripMapCities.map((c) => c.countryCode)).size,
    tripCount: new Set(tripMapCities.flatMap((c) => c.trips.map((t) => t.id))).size,
}

const EMPTY_MAP_SUMMARY: TripMapSummary = { cityCount: 0, placeCount: 0, countryCount: 0, tripCount: 0 }

// GALLERY_TODAY is 2026-07-14; the base fixture trip runs Jul 2–11 (complete).

const travelling = makePassTrip({
    name: 'Japan ’26',
    startDate: '2026-07-11',
    endDate: '2026-07-19',
})

const travellingOwing = makePassTrip({
    name: 'Osaka Detour',
    startDate: '2026-07-12',
    endDate: '2026-07-16',
    countries: ['JP', 'KR'],
    stats: makeTripStats({
        yourNetUsd: -41.5,
        todaySpendUsd: 0,
        latestExpense: { name: 'Karaoke night', byFirstName: 'Marco', reportedAt: '2026-07-13T22:10:00Z' },
    }),
})

const travellingEmpty = makePassTrip({
    name: 'Long Haul',
    startDate: '2026-06-20',
    endDate: '2026-07-20', // 31 days — journey bar skips the day ticks
    stats: makeTripStats({
        expenseCount: 0,
        totalSpendUsd: 0,
        todaySpendUsd: 0,
        yourShareUsd: 0,
        yourNetUsd: 0,
        isSettled: true,
        latestExpense: null,
    }),
})

const upcoming = makePassTrip({
    name: 'SE Asia ’26',
    startDate: '2026-09-03',
    endDate: '2026-09-17',
    countries: ['TH', 'VN'],
    stats: makeTripStats({
        expenseCount: 2,
        totalSpendUsd: 890,
        todaySpendUsd: 0,
        yourNetUsd: 0,
        latestExpense: { name: 'Bangkok flights', byFirstName: 'Ivan', reportedAt: '2026-07-12T10:00:00Z' },
    }),
})

const upcomingTomorrow = makePassTrip({
    name: 'Weekend Escape',
    startDate: '2026-07-15',
    endDate: '2026-07-17',
    countries: ['MX'],
    stats: makeTripStats({
        expenseCount: 0,
        totalSpendUsd: 0,
        todaySpendUsd: 0,
        yourNetUsd: 0,
        latestExpense: null,
    }),
})

const completeSettled = makePassTrip({
    name: 'Kyoto ’25',
    startDate: '2025-11-02',
    endDate: '2025-11-09',
    stats: makeTripStats({
        expenseCount: 42,
        totalSpendUsd: 2340,
        yourShareUsd: 1105,
        yourNetUsd: 0,
        isSettled: true,
    }),
})

const completeOwing = makePassTrip({
    name: 'SE Asia ’24',
    startDate: '2024-03-08',
    endDate: '2024-03-19',
    countries: ['TH', 'VN'],
    stats: makeTripStats({
        expenseCount: 18,
        totalSpendUsd: 1082,
        yourShareUsd: 312,
        yourNetUsd: -12,
        isSettled: false,
    }),
})

const completeOwed = makePassTrip({
    name: 'Taipei ’26',
    startDate: '2026-03-20',
    endDate: '2026-03-24',
    countries: ['TW'],
    stats: makeTripStats({
        expenseCount: 23,
        totalSpendUsd: 1760,
        yourShareUsd: 440,
        yourNetUsd: 45,
        isSettled: false,
        latestExpense: { name: 'Night market', byFirstName: 'Jenny', reportedAt: '2026-03-24T20:00:00Z' },
    }),
})

// Three countries incl. Norway — reproduces the "only 2 stamps" cap bug.
const completeScandinavia = makePassTrip({
    name: 'Scandinavia ’25',
    startDate: '2025-06-01',
    endDate: '2025-06-14',
    countries: ['SE', 'NO', 'DK'],
    stats: makeTripStats({
        expenseCount: 31,
        totalSpendUsd: 2980,
        yourShareUsd: 720,
        yourNetUsd: 18,
        isSettled: false,
    }),
})

const noStats = makePassTrip({
    name: 'No Stats (slug fetch)',
    startDate: '2026-07-11',
    endDate: '2026-07-19',
    stats: undefined,
})

// Departures board (home Trips launcher). Mixed states so the flap cycles through
// all three statuses; ordering is handled inside the component (current first).
const boardTrips = [
    makePassTrip({ name: 'Osaka Detour', startDate: '2026-07-12', endDate: '2026-07-16' }), // travelling
    makePassTrip({ name: 'SE Asia ’26', startDate: '2026-09-03', endDate: '2026-09-17' }), // upcoming
    makePassTrip({ name: 'Kyoto ’25', startDate: '2025-11-02', endDate: '2025-11-09' }), // complete
    makePassTrip({ name: 'Lisbon ’25', startDate: '2025-05-01', endDate: '2025-05-10' }), // complete
]

// Long name (auto-truncated to "SE ASIA") spanning the new year (cross-year range).
const boardLongName = makePassTrip({
    name: 'SE Asia Christmas ’26',
    startDate: '2026-12-20',
    endDate: '2027-01-03',
})

// The width the board renders at on the home page (content minus its padding).
const HOME_WIDTH = 326

export default function TripsGallery() {
    return (
        <GalleryPage title="Trips">
            <SpecimenGroup title="Departures board — home Trips launcher">
                <Specimen label="cycles current → upcoming → past (live animation)" width={HOME_WIDTH}>
                    <DeparturesBoard trips={boardTrips} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="single trip — no cycle, no dots" width={HOME_WIDTH}>
                    <DeparturesBoard trips={[boardTrips[1]]} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="past trips only" width={HOME_WIDTH}>
                    <DeparturesBoard
                        trips={[boardTrips[2], boardTrips[3]]}
                        todayIso={GALLERY_TODAY}
                    />
                </Specimen>
                <Specimen label="long name truncated · cross-year range" width={HOME_WIDTH}>
                    <DeparturesBoard trips={[boardLongName]} todayIso={GALLERY_TODAY} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Now travelling">
                <Specimen label="day 4 of 9 · you're owed · fresh activity">
                    <BoardingPass trip={travelling} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="you owe · $0 today · two countries">
                    <BoardingPass trip={travellingOwing} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="31-day trip (no day ticks) · no expenses yet">
                    <BoardingPass trip={travellingEmpty} todayIso={GALLERY_TODAY} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Upcoming">
                <Specimen label="pre-trip spend + planning activity">
                    <BoardingPass trip={upcoming} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="departs tomorrow · nothing logged">
                    <BoardingPass trip={upcomingTomorrow} todayIso={GALLERY_TODAY} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Trip complete">
                <Specimen label="settled · entry stamp">
                    <BoardingPass trip={completeSettled} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="you owe $12 · two entry stamps">
                    <BoardingPass trip={completeOwing} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="you're owed $45">
                    <BoardingPass trip={completeOwed} todayIso={GALLERY_TODAY} />
                </Specimen>
                <Specimen label="three countries incl. Norway · all three stamps">
                    <BoardingPass trip={completeScandinavia} todayIso={GALLERY_TODAY} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Edge cases">
                <Specimen label="stats missing — body only, no stub">
                    <BoardingPass trip={noStats} todayIso={GALLERY_TODAY} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Loading skeleton">
                <Specimen label="shown on the trips list while trips load">
                    <BoardingPassSkeleton />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Your Trip Map — Cities/Places toggle, fit-to-dots">
                <Specimen label="15 cities / 20 places · toggle top-right">
                    <Box sx={{ height: 520 }}>
                        <TripsMap cities={tripMapCities} places={tripMapPlaces} summary={tripMapSummary} />
                    </Box>
                </Specimen>
                <Specimen label="empty — no mapped places yet">
                    <Box sx={{ height: 520 }}>
                        <TripsMap cities={[]} places={[]} summary={EMPTY_MAP_SUMMARY} />
                    </Box>
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
