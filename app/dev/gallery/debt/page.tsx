'use client'

import DebtsPage from '../../../gustavo/trips/[slug]/debts/page'
import { PairDetail } from 'components/debt/pair-detail'
import { PersonBalanceCard } from 'components/debt/person-balance-card'
import { SettlementCard } from 'components/debt/settlement-card'
import { SettleProgressCard, SettleRow, SettledRow } from 'components/debt/settle-up'
import { PersonSwitcher } from 'components/person-switcher'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'
import { computeNetBalances, simplifyDebts } from '@/lib/debt'
import { GalleryPage, SpecimenGroup, Specimen } from '../gallery-ui'
import { currentUserId, debtMap, expenses, ivan, jenny, marco, participantById, participants, priya, settlementRecords, trip } from '../fixtures'

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
                <Specimen label="DebtsPage — view-as, stats, progress, map, grouped rows, settled list">
                    <TripDataProvider
                        expenses={expenses}
                        settlements={settlementRecords}
                        trip={trip}>
                        <SpendDataProvider>
                            <DebtsPage />
                        </SpendDataProvider>
                    </TripDataProvider>
                </Specimen>
                <Specimen label="PairDetail — Ivan owes Marco (expenses + recorded payment)">
                    <TripDataProvider
                        expenses={expenses}
                        settlements={settlementRecords}
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

            <SpecimenGroup title="Settle-up components (presentational)">
                <Specimen label="SettleProgressCard — mid-way (2 of 5)">
                    <SettleProgressCard
                        settledCount={2}
                        settledSum={227}
                        remainingCount={3}
                        remainingSum={256}
                    />
                </Specimen>
                <Specimen label="SettleProgressCard — everything settled">
                    <SettleProgressCard
                        settledCount={4}
                        settledSum={483}
                        remainingCount={0}
                        remainingSum={0}
                    />
                </Specimen>
                <Specimen label="SettleProgressCard — >12 payments falls back to continuous fill">
                    <SettleProgressCard
                        settledCount={9}
                        settledSum={510}
                        remainingCount={11}
                        remainingSum={745}
                    />
                </Specimen>
                <Specimen label="SettleRow — you pay, counterparty has Venmo (deep-links the app)">
                    <SettleRow
                        debtor={ivan}
                        creditor={marco}
                        amount={128}
                        perspectiveId={ivan.id}
                        youId={ivan.id}
                        venmo={{ url: marco.venmoUrl!, note: trip.name }}
                        onTap={noop}
                        onMarkPaid={noop}
                    />
                </Specimen>
                <Specimen label="SettleRow — coming to you (no Venmo)">
                    <SettleRow
                        debtor={jenny}
                        creditor={ivan}
                        amount={86}
                        perspectiveId={ivan.id}
                        youId={ivan.id}
                        onTap={noop}
                        onMarkPaid={noop}
                    />
                </Specimen>
                <Specimen label="SettleRow — between others (neutral pair)">
                    <SettleRow
                        debtor={priya}
                        creditor={jenny}
                        amount={30}
                        perspectiveId={ivan.id}
                        youId={ivan.id}
                        onTap={noop}
                        onMarkPaid={noop}
                    />
                </Specimen>
                <Specimen label="SettledRow — recorded payment with undo">
                    <SettledRow
                        record={settlementRecords[1]}
                        from={ivan}
                        to={marco}
                        youId={ivan.id}
                        onUndo={noop}
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
