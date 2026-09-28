'use client'

/** Gallery specimens for the home page — the board, the quick actions
 *  (receipt-style Add expense, split-flap Track weight), the Latest deck, and the Health cards
 *  (workouts, daily stack). The
 *  real home page is auth-gated; verify these here. */
import { Box } from '@mui/material'
import { useState } from 'react'

import DeparturesBoard from 'components/departures-board'
import ActivityDeck from 'components/home/activity-deck'
import { FlapScaleButton, ReceiptButton } from 'components/home/quick-actions'
import SupplementsCard from 'components/home/supplements-card'
import HomeLayout from 'components/home/home-layout'
import { useHomeHeaderStore } from 'components/home/home-header-store'
import { HeaderQuote } from 'components/home/home-quote'
import WorkoutsCard from 'components/home/workouts-card'
import type { DaysSince, Workout, WorkoutPreset } from '@/lib/health-types'
import { isDone, type StackItem } from '@/lib/health/supplement-stack'
import type { HomeActivityEntry } from '@/lib/types'

import { GALLERY_TODAY, makePassTrip } from '../fixtures'
import { presets } from '../health-fixtures'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

const HOME_WIDTH = 311
const NOW = new Date(`${GALLERY_TODAY}T19:12:00`)
const hoursAgo = (h: number) =>
    new Date(NOW.getTime() - h * 3600000).toISOString()

const trips = [
    makePassTrip({
        name: 'Tokyo & Kyoto',
        slug: 'tokyo-kyoto',
        startDate: '2026-07-26',
        endDate: '2026-08-07',
    }),
    makePassTrip({
        name: 'Lisbon ’26',
        startDate: '2026-06-02',
        endDate: '2026-06-11',
    }),
    makePassTrip({
        name: 'Big Sur',
        startDate: '2026-03-14',
        endDate: '2026-03-17',
    }),
]

const actor = (name: string, initials: string, iconColor: string) => ({
    name,
    initials,
    iconColor,
})
const jenny = actor('Jenny', 'JL', '#e5989b')
const mika = actor('Mika', 'MK', '#64b5f6')

const entry = (
    id: string,
    who: HomeActivityEntry['actor'],
    intent: HomeActivityEntry['intent'],
    expenseName: string,
    cost: number | null,
    currency: string,
    h: number
): HomeActivityEntry => ({
    id,
    tripId: '1',
    tripSlug: 'tokyo-kyoto',
    tripName: 'Tokyo & Kyoto',
    expenseId: id,
    intent,
    expenseName,
    costOriginal: cost,
    currency,
    actor: who,
    changedAt: hoursAgo(h),
})

const activity: HomeActivityEntry[] = [
    entry('1', jenny, 'create', 'Hotel deposit', 180, 'USD', 50),
    entry('2', jenny, 'update', 'JR Pass ×2', 460, 'USD', 96),
    entry('3', mika, 'create', 'Sumo tickets', 24000, 'JPY', 140),
]
const activityEdge: HomeActivityEntry[] = [
    entry(
        '4',
        mika,
        'delete',
        'Konbini run with a very long name that should truncate',
        1120,
        'JPY',
        3
    ),
    entry('5', jenny, 'create', 'Taxi', null, 'USD', 0.2),
]

const ds = (muscleGroup: string, daysSince: number | null): DaysSince => ({
    muscleGroup,
    daysSince,
    lastDate: null,
})
const daysSince: DaysSince[] = [
    ds('Chest', 2),
    ds('Shoulders', 2),
    ds('Triceps', 2),
    ds('Upper Back', 4),
    ds('Biceps', 4),
    ds('Forearms', 4),
    ds('Legs', 11),
    ds('Lower Back', 9),
    ds('Core', 37),
    ds('Cardio', null),
]

/** Recent workouts consistent with the daysSince fixture above. */
const daysAgoIso = (n: number) => {
    const d = new Date(GALLERY_TODAY + 'T00:00:00')
    d.setDate(d.getDate() - n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const recentWorkouts: Workout[] = [
    [2, ['Chest', 'Shoulders', 'Triceps']],
    [4, ['Lats', 'Biceps', 'Forearms']],
    [7, ['Chest', 'Front Delts']],
    [9, ['Lower Back']],
    [11, ['Quads', 'Hamstrings']],
    [11, ['Upper Back', 'Biceps']],
].map(([n, groups], i) => ({
    id: i + 1,
    date: daysAgoIso(n as number),
    notes: null,
    muscleGroups: (groups as string[]).map((name, j) => ({ id: j + 1, name })),
    exercises: [],
    createdAt: '',
}))

const initialStack: StackItem[] = [
    { supplementId: 1, name: 'Creatine', dosesPerDay: 1, taken: 1, logId: 1 },
    {
        supplementId: 2,
        name: 'Electrolytes',
        dosesPerDay: 3,
        taken: 2,
        logId: 2,
    },
    { supplementId: 3, name: 'Fish Oil', dosesPerDay: 2, taken: 1, logId: 3 },
    {
        supplementId: 4,
        name: 'Magnesium',
        dosesPerDay: 1,
        taken: 0,
        logId: null,
    },
    { supplementId: 5, name: 'Vitamin D', dosesPerDay: 1, taken: 1, logId: 5 },
    {
        supplementId: 6,
        name: 'Water (glasses)',
        dosesPerDay: 8,
        taken: 3,
        logId: 6,
    },
]

/** Tappable stack with local state, like the page's optimistic updates. */
function LiveStack({ start }: { start: StackItem[] }) {
    const [items, setItems] = useState(start)
    return (
        <SupplementsCard
            items={items}
            onTap={(item) =>
                setItems((cur) =>
                    cur.map((i) =>
                        i.supplementId === item.supplementId
                            ? {
                                  ...i,
                                  taken: Math.max(
                                      0,
                                      i.taken + (isDone(i) ? -1 : 1)
                                  ),
                              }
                            : i
                    )
                )
            }
            onUndo={(item) =>
                setItems((cur) =>
                    cur.map((i) =>
                        i.supplementId === item.supplementId
                            ? { ...i, taken: Math.max(0, i.taken - 1) }
                            : i
                    )
                )
            }
        />
    )
}

function LiveWorkouts({ presetList }: { presetList: WorkoutPreset[] }) {
    const [applied, setApplied] = useState<number | null>(null)
    return (
        <WorkoutsCard
            daysSince={daysSince}
            workouts={recentWorkouts}
            today={GALLERY_TODAY}
            presets={presetList}
            applyingId={null}
            appliedId={applied}
            onApplyPreset={(p) => setApplied(p.id)}
        />
    )
}

/**
 * The compact-greeting behaviour: a phone-sized scroll area with the id the
 * app shell uses (#main-scroll), a mock header that reads the same store, and
 * buttons to grow/shrink the content. Few cards → big Gus + quote; enough that
 * it wouldn't all fit → the greeting moves up into the header.
 */
function CompactHarness() {
    const [cards, setCards] = useState(2)
    const compact = useHomeHeaderStore((st) => st.compact)
    const btn = { font: 'inherit', fontSize: 13, padding: '4px 10px', border: '1px solid #090401', borderRadius: 4, background: '#f7cd83', cursor: 'pointer' }
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <button type="button" style={btn} onClick={() => setCards((n) => Math.max(0, n - 1))}>− card</button>
                <button type="button" style={btn} onClick={() => setCards((n) => n + 1)}>+ card</button>
                <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{cards} cards · compact: {String(compact)}</span>
            </Box>
            <Box sx={{ border: '2px solid #090401', borderRadius: 3, overflow: 'hidden', background: '#fefae0' }}>
                <Box sx={{ height: 56, display: 'flex', alignItems: 'center', gap: '10px', paddingX: 2, borderBottom: '1px dashed #b9ab8a' }}>
                    {compact && (
                        <>
                            <img src="/gus-fring.png" alt="" style={{ width: 36, height: 36, borderRadius: '100%', objectFit: 'cover' }} />
                            <Box sx={{ minWidth: 0 }}>
                                <HeaderQuote />
                            </Box>
                        </>
                    )}
                </Box>
                <Box id="main-scroll" sx={{ height: 560, overflowY: 'auto' }}>
                    <HomeLayout>
                        {Array.from({ length: cards }, (_, i) => (
                            <Box key={i} sx={{ height: 110, border: '1px solid #090401', borderRadius: 1, boxShadow: '2px 2px 0 #090401', background: '#fffdf7', display: 'grid', placeItems: 'center', fontSize: 13 }}>
                                Card {i + 1}
                            </Box>
                        ))}
                    </HomeLayout>
                </Box>
            </Box>
        </Box>
    )
}

export default function HomeGallery() {
    return (
        <GalleryPage title="Home">
            <SpecimenGroup title="Compact greeting (quote in header when content won't fit)">
                <Specimen label="add cards until it overflows — the greeting moves up" width={HOME_WIDTH + 64}>
                    <CompactHarness />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Board + quick actions">
                <Specimen
                    label="trip coming up · weighed in earlier this week"
                    width={HOME_WIDTH}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}>
                        <DeparturesBoard
                            trips={trips}
                            todayIso={GALLERY_TODAY}
                        />
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 1.5,
                            }}>
                            <ReceiptButton
                                href="#"
                                tripName="Tokyo & Kyoto"
                                tripWhen="IN 12 DAYS"
                            />
                            <FlapScaleButton
                                href="#"
                                reading="172.4"
                                when="FRI"
                                done={false}
                            />
                        </Box>
                    </Box>
                </Specimen>
                <Specimen
                    label="weighed in today · long trip name"
                    width={HOME_WIDTH}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1.5,
                        }}>
                        <ReceiptButton
                            href="#"
                            tripName="Southeast Asia Backpacking Extravaganza"
                            tripWhen="DAY 3/13"
                        />
                        <FlapScaleButton
                            href="#"
                            reading="170.8"
                            when="TODAY"
                            done
                        />
                    </Box>
                </Specimen>
                <Specimen
                    label="trips only — Add expense alone"
                    width={HOME_WIDTH}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1.5,
                        }}>
                        <ReceiptButton
                            href="#"
                            tripName="Tokyo & Kyoto"
                            tripWhen="IN 12 DAYS"
                        />
                    </Box>
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Latest deck">
                <Specimen
                    label="3 cards — auto-advances; swipe on a phone"
                    width={HOME_WIDTH}>
                    <ActivityDeck entries={activity} now={NOW} />
                </Specimen>
                <Specimen
                    label="2 cards · delete (struck amount) · no amount · long name"
                    width={HOME_WIDTH}>
                    <ActivityDeck
                        entries={activityEdge}
                        now={NOW}
                        autoAdvance={false}
                    />
                </Specimen>
                <Specimen label="1 card — no stack, no pips" width={HOME_WIDTH}>
                    <ActivityDeck entries={[activity[0]]} now={NOW} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Workouts">
                <Specimen
                    label="history strip · left bar = suggested routine's groups; tap a routine to mark it logged"
                    width={HOME_WIDTH}>
                    <LiveWorkouts presetList={presets} />
                </Specimen>
                <Specimen
                    label="no routines yet — the + grows a label"
                    width={HOME_WIDTH}>
                    <LiveWorkouts presetList={[]} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Daily supplement stack">
                <Specimen
                    label="mixed — tap to take a dose; swipe a row left to Undo"
                    width={HOME_WIDTH}>
                    <LiveStack start={initialStack} />
                </Specimen>
                <Specimen label="all done" width={HOME_WIDTH}>
                    <LiveStack
                        start={initialStack
                            .slice(0, 3)
                            .map((i) => ({ ...i, taken: i.dosesPerDay }))}
                    />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
