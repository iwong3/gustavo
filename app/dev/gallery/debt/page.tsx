'use client'

import { PersonBalanceCard } from 'components/debt/person-balance-card'
import { SettlementCard } from 'components/debt/settlement-card'
import { computeNetBalances, simplifyDebts } from '@/lib/debt'
import { GalleryPage, SpecimenGroup, Specimen } from '../gallery-ui'
import { currentUserId, debtMap, participantById, participants } from '../fixtures'

const noop = () => {}

export default function DebtGallery() {
    const balances = computeNetBalances(debtMap, participants)
    const balanceByUser = new Map(balances.map((b) => [b.userId, b]))
    const settlements = simplifyDebts(debtMap, participants)

    return (
        <GalleryPage title="Debt">
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
                        balance={balanceByUser.get(2)!}
                        participant={participantById.get(2)!}
                        currentUserId={currentUserId}
                        debtMap={debtMap}
                        participantById={participantById}
                        onTap={noop}
                    />
                </Specimen>
                <Specimen label="390px (default)">
                    <PersonBalanceCard
                        balance={balanceByUser.get(2)!}
                        participant={participantById.get(2)!}
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
