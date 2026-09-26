'use client'

/** Gallery: the Debts page under the real providers, across its states. */
import { simplifyDebts } from '@/lib/debt'
import { computeDebtMap } from '@/lib/spend'
import type { Expense, SettlementRecord, TripSummary, UserSummary } from '@/lib/types'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'

import DebtsPage from '../../../gustavo/trips/[slug]/debts/page'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'
import { expenses, ivan, jenny, makeExpense, marco, priya, settlementRecords, trip } from '../fixtures'

const asId = (s: string) => s as unknown as number

// Fewest payments reroutes here: Ivan owes Jenny directly, but the plan
// sends his money elsewhere — exercises "Why these people?"
const rerouteExpenses: Expense[] = [
    makeExpense({ name: 'Hotel Alfama', date: '2026-07-02', categoryName: 'Lodging', costOriginal: 540, costConvertedUsd: 540, paidBy: marco, splitBetween: [ivan, marco, priya] }),
    makeExpense({ name: 'Groceries', date: '2026-07-03', categoryName: 'Groceries', costOriginal: 140, costConvertedUsd: 140, paidBy: ivan, splitBetween: [ivan, marco] }),
    makeExpense({ name: 'Dinner, Time Out', date: '2026-07-03', costOriginal: 90, costConvertedUsd: 90, paidBy: jenny, splitBetween: [ivan, jenny] }),
    makeExpense({ name: 'Museum tickets', date: '2026-07-04', categoryName: 'Attraction', costOriginal: 120, costConvertedUsd: 120, paidBy: priya, splitBetween: [priya, jenny, ivan] }),
    makeExpense({ name: 'Taxi to Sintra', date: '2026-07-05', categoryName: 'Transit', costOriginal: 60.1, costConvertedUsd: 60.1, paidBy: ivan, splitBetween: [ivan, priya, jenny] }),
    makeExpense({ name: 'Wine bar', date: '2026-07-05', costOriginal: 75, costConvertedUsd: 75, paidBy: jenny, splitBetween: [jenny, marco, priya] }),
]

// Eight people: a long waterfall, every row shown
const names = ['Ava', 'Ben', 'Cleo', 'Dev', 'Elle', 'Finn', 'Gus']
const colorsFor = ['#dac4f7', '#aed9e0', '#90be6d', '#ff9b85', '#b8d8ba', '#f0b8b4', '#a7bed3']
const bigGroup: UserSummary[] = [
    ivan,
    ...names.map((firstName, i) => ({
        ...ivan,
        id: asId(`${100 + i}`),
        firstName,
        name: firstName,
        initials: firstName.slice(0, 2).toUpperCase(),
        iconColor: colorsFor[i],
        venmoUrl: null,
    })),
]
const bigTrip: TripSummary = {
    ...trip,
    participants: bigGroup.map((p) => ({ ...p, role: String(p.id) === String(ivan.id) ? ('owner' as const) : ('editor' as const) })),
}
const bigExpenses: Expense[] = bigGroup.flatMap((payer, i) => [
    makeExpense({ name: `${payer.firstName}'s round`, date: `2026-07-0${2 + (i % 6)}`, costOriginal: 40 + i * 23.5, costConvertedUsd: 40 + i * 23.5, paidBy: payer, isEveryone: true, splitBetween: bigGroup }),
    makeExpense({ name: `Snacks via ${payer.firstName}`, date: `2026-07-0${3 + (i % 5)}`, costOriginal: 12 + i * 3.3, costConvertedUsd: 12 + i * 3.3, paidBy: payer, splitBetween: [payer, bigGroup[(i + 1) % bigGroup.length]] }),
])

// A payment recorded under "Pay who you owe" — the trip is locked to it
const directRecord: SettlementRecord[] = [
    { ...settlementRecords[1], id: asId('9101'), plan: 'direct', amountUsd: 25 },
]

/** Each specimen gets its own trip id — the page keeps its view state per trip. */
/** Every payment of the fewest plan already recorded — the trip is all square. */
function settledAll(exp: Expense[], people: UserSummary[]): SettlementRecord[] {
    return simplifyDebts(computeDebtMap(exp, people.length).debtMap, people).map((s, i) => ({
        ...settlementRecords[0],
        id: asId(String(9200 + i)),
        fromUserId: s.debtorId,
        toUserId: s.creditorId,
        amountUsd: s.amount,
        plan: 'fewest',
    }))
}

function Page({ id, t = trip, exp, settlements }: { id: number; t?: TripSummary; exp: Expense[]; settlements: SettlementRecord[] }) {
    return (
        <TripDataProvider expenses={exp} settlements={settlements} trip={{ ...t, id }}>
            <SpendDataProvider>
                <DebtsPage />
            </SpendDataProvider>
        </TripDataProvider>
    )
}

export default function DebtGallery() {
    return (
        <GalleryPage title="Debt">
            <SpecimenGroup title="Debts page (real providers + fixture expenses)">
                <Specimen label="Nothing settled yet — plan toggle, reroutes (tap Why these people?), tap a row for its expenses">
                    <Page id={901} exp={rerouteExpenses} settlements={[]} />
                </Specimen>
                <Specimen label="Payments recorded — locked to Fewest payments, grey paid rows, Settled list (swipe to undo)">
                    <Page id={902} exp={expenses} settlements={settlementRecords} />
                </Specimen>
                <Specimen label="Locked to Pay who you owe">
                    <Page id={903} exp={rerouteExpenses} settlements={directRecord} />
                </Specimen>
                <Specimen label="Eight people — every row shown">
                    <Page id={904} t={bigTrip} exp={bigExpenses} settlements={[]} />
                </Specimen>
                <Specimen label="All square, big group — every payment settled; grey paid rows bring it to $0">
                    <Page id={906} t={bigTrip} exp={bigExpenses} settlements={settledAll(bigExpenses, bigGroup)} />
                </Specimen>
                <Specimen label="No expenses">
                    <Page id={905} exp={[]} settlements={[]} />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
