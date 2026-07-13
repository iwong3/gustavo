'use client'

import DebtsPage from '../../../gustavo/trips/[slug]/debts/page'
import { PairDetail } from 'components/debt/pair-detail'
import { PersonBalanceCard } from 'components/debt/person-balance-card'
import { SettlementCard } from 'components/debt/settlement-card'
import { PersonSwitcher } from 'components/person-switcher'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'
import { computeNetBalances, simplifyDebts } from '@/lib/debt'
import { GalleryPage, SpecimenGroup, Specimen } from '../gallery-ui'
import { currentUserId, debtMap, expenses, ivan, jenny, marco, participantById, participants, trip } from '../fixtures'

const noop = () => {}

// 8-person group: compact avatars + horizontal swipe (id strings = runtime truth)
const bigGroup = ['Ava', 'Ben', 'Cleo', 'Dev', 'Elle', 'Finn', 'Gus', 'Hana'].map(
    (firstName, i) => ({
        ...ivan,
        id: `${100 + i}` as unknown as number,
        firstName,
        name: firstName,
        initials: firstName.slice(0, 2).toUpperCase(),
        iconColor: ['#f7cd83', '#dac4f7', '#aed9e0', '#90be6d', '#ff9b85', '#b8d8ba', '#f0b8b4', '#a7bed3'][i],
    })
)


export default function DebtGallery() {
    const balances = computeNetBalances(debtMap, participants)
    const balanceByUser = new Map(balances.map((b) => [b.userId, b]))
    const settlements = simplifyDebts(debtMap, participants)

    return (
        <GalleryPage title="Debt">
            <SpecimenGroup title="Money-map page (real providers + fixture expenses)">
                <Specimen label="DebtsPage — view-as, stats, map, settle rows">
                    <TripDataProvider
                        expenses={expenses}
                        trip={trip}>
                        <SpendDataProvider>
                            <DebtsPage />
                        </SpendDataProvider>
                    </TripDataProvider>
                </Specimen>
                <Specimen label="PairDetail — Ivan owes Marco (hotel vs ramen)">
                    <TripDataProvider
                        expenses={expenses}
                        trip={trip}>
                        <SpendDataProvider>
                            <PairDetail
                                debtorId={ivan.id}
                                creditorId={marco.id}
                            />
                        </SpendDataProvider>
                    </TripDataProvider>
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="PersonSwitcher — big group">
                <Specimen label="8 people: compact avatars, swipes sideways (selection interaction covered by the page specimen above)">
                    <PersonSwitcher
                        participants={bigGroup}
                        selectedId={bigGroup[2].id}
                        onSelect={noop}
                        label="View as"
                    />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="PersonBalanceCard">
                {balances.map((balance) => {
                    const participant = participantById.get(balance.userId)
                    if (!participant) return null
                    const state =
                        balance.netBalance > 0.005
                            ? 'is owed'
                            : balance.netBalance < -0.005
                              ? 'owes'
                              : 'settled'
                    const you = balance.userId === currentUserId ? ', current user' : ''
                    return (
                        <Specimen key={balance.userId} label={`${participant.firstName} — ${state}${you}`}>
                            <PersonBalanceCard
                                balance={balance}
                                participant={participant}
                                currentUserId={currentUserId}
                                debtMap={debtMap}
                                participantById={participantById}
                                onTap={noop}
                            />
                        </Specimen>
                    )
                })}
            </SpecimenGroup>

            <SpecimenGroup title="SettlementCard">
                {settlements.map((s, i) => {
                    const debtor = participantById.get(s.debtorId)
                    const creditor = participantById.get(s.creditorId)
                    const involvement =
                        s.debtorId === currentUserId
                            ? 'you owe'
                            : s.creditorId === currentUserId
                              ? 'you are owed'
                              : 'others'
                    return (
                        <Specimen
                            key={i}
                            label={`${debtor?.firstName} → ${creditor?.firstName} (${involvement})`}>
                            <SettlementCard
                                settlement={s}
                                participantById={participantById}
                                currentUserId={currentUserId}
                                onTap={noop}
                            />
                        </Specimen>
                    )
                })}
            </SpecimenGroup>

            <SpecimenGroup title="PersonBalanceCard — width comparison">
                <Specimen label="320px (small phone)" width={320}>
                    <PersonBalanceCard
                        balance={balanceByUser.get(jenny.id)!}
                        participant={participantById.get(jenny.id)!}
                        currentUserId={currentUserId}
                        debtMap={debtMap}
                        participantById={participantById}
                        onTap={noop}
                    />
                </Specimen>
                <Specimen label="390px (default)">
                    <PersonBalanceCard
                        balance={balanceByUser.get(jenny.id)!}
                        participant={participantById.get(jenny.id)!}
                        currentUserId={currentUserId}
                        debtMap={debtMap}
                        participantById={participantById}
                        onTap={noop}
                    />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
