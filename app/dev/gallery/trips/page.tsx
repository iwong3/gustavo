'use client'

/** Gallery specimens for the boarding-pass trip cards — every state + edge cases. */
import BoardingPass from 'components/boarding-pass'

import { GALLERY_TODAY, makePassTrip, makeTripStats } from '../fixtures'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

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

const noStats = makePassTrip({
    name: 'No Stats (slug fetch)',
    startDate: '2026-07-11',
    endDate: '2026-07-19',
    stats: undefined,
})

export default function TripsGallery() {
    return (
        <GalleryPage title="Trips">
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
            </SpecimenGroup>

            <SpecimenGroup title="Edge cases">
                <Specimen label="stats missing — body only, no stub">
                    <BoardingPass trip={noStats} todayIso={GALLERY_TODAY} />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
