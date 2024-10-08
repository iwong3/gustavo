import Box from '@mui/material/Box'
import { InitialsIcon } from 'helpers/icons'
import { FormattedMoney } from 'helpers/currency'
import { Person } from 'helpers/person'
import { getSplitCost } from 'helpers/spend'
import { useEffect } from 'react'
import { useGustavoStore } from 'views/gustavo'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

type SpendTotals = {
    totalSpent: number
    totalCovered: number
}

type SummaryByPersonState = {
    spendTotalsByPerson: Map<Person, SpendTotals>
    debtMapByPerson: Map<Person, Map<Person, number>>
}

type SummaryByPersonActions = {
    setSpendTotalsByPerson: (spendTotalsByPerson: Map<Person, SpendTotals>) => void
    setDebtMapByPerson: (debtMapByPerson: Map<Person, Map<Person, number>>) => void
}

export const useSummaryByPersonStore = create<SummaryByPersonState & SummaryByPersonActions>(
    (set, get) => ({
        spendTotalsByPerson: new Map<Person, SpendTotals>(),
        debtMapByPerson: new Map<Person, Map<Person, number>>(),

        setSpendTotalsByPerson: (spendTotalsByPerson: Map<Person, SpendTotals>) =>
            set(() => ({ spendTotalsByPerson })),
        setDebtMapByPerson: (debtMapByPerson: Map<Person, Map<Person, number>>) =>
            set(() => ({ debtMapByPerson })),
    })
)

export const SummaryByPerson = () => {
    const { filteredSpendData: spendData } = useGustavoStore()

    const { spendTotalsByPerson, setSpendTotalsByPerson, setDebtMapByPerson } =
        useSummaryByPersonStore(useShallow((state) => state))

    useEffect(() => {
        const spendTotals = new Map<Person, SpendTotals>()
        const debtMap = new Map<Person, Map<Person, number>>()

        let persons = Object.values(Person).filter((person) => person !== Person.Everyone)
        persons.forEach((person) => {
            spendTotals.set(person, { totalSpent: 0, totalCovered: 0 })
            debtMap.set(person, new Map<Person, number>())
        })

        spendData.forEach((spend) => {
            const { paidBy, convertedCost, splitBetween } = spend

            // update current pereson's total covered cost
            let spendTotal = spendTotals.get(paidBy)
            if (!spendTotal) {
                spendTotal = {
                    totalSpent: 0,
                    totalCovered: 0,
                }
            }
            spendTotal.totalCovered += convertedCost
            spendTotals.set(paidBy, spendTotal)

            let splitters: Person[] = splitBetween
            if (splitBetween.includes(Person.Everyone)) {
                splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
            }
            splitters = splitters.filter((person) => person !== paidBy)
            splitters.forEach((splitter) => {
                const splitCost = getSplitCost(convertedCost, splitBetween)

                // update splitter's debt
                let splitterDebtMap = debtMap.get(splitter)
                if (!splitterDebtMap) {
                    splitterDebtMap = new Map<Person, number>()
                }
                splitterDebtMap.set(paidBy, (splitterDebtMap.get(paidBy) || 0) + splitCost)
                debtMap.set(splitter, splitterDebtMap)

                // update paidBy's debt
                let paidByDebtMap = debtMap.get(paidBy)
                if (!paidByDebtMap) {
                    paidByDebtMap = new Map<Person, number>()
                }
                paidByDebtMap.set(splitter, (paidByDebtMap.get(splitter) || 0) - splitCost)
                debtMap.set(paidBy, paidByDebtMap)
            })
        })

        // calculate each person's total spent
        spendTotals.forEach((spendTotal, person) => {
            let totalSpent = spendTotal.totalCovered
            const debts = debtMap.get(person)
            if (debts) {
                debts.forEach((debt) => {
                    totalSpent += debt
                })
            }
            spendTotal.totalSpent = totalSpent
            spendTotals.set(person, spendTotal)
        })

        setDebtMapByPerson(debtMap)
        setSpendTotalsByPerson(spendTotals)
    }, [spendData])

    const spendTotalsArray = Array.from(spendTotalsByPerson)

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                }}>
                {spendTotalsArray
                    .slice(0, spendTotalsArray.length / 2)
                    .map(([person, spendTotal]) => (
                        <Box
                            key={'summary-by-person-' + person}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            <InitialsIcon key={person} person={person} />
                            {FormattedMoney('USD', 2).format(spendTotal.totalSpent)}
                        </Box>
                    ))}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                }}>
                {spendTotalsArray.slice(spendTotalsArray.length / 2).map(([person, spendTotal]) => (
                    <Box
                        key={'summary-by-person-' + person}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        <InitialsIcon key={person} person={person} />
                        {FormattedMoney('USD', 2).format(spendTotal.totalSpent)}
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
