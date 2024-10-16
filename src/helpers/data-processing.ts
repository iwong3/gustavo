import { Location } from 'helpers/location'
import { Person } from 'helpers/person'
import { getSplitCost, Spend, SpendType } from 'helpers/spend'

interface ProcessSpendDataResponse {
    totalSpend: number
    debtMap: Map<Person, Map<Person, number>>
}

export const processSpendData = (spendData: Spend[]): ProcessSpendDataResponse => {
    let totalSpend = 0

    // initialize debt map
    const debtMap = new Map<Person, Map<Person, number>>()
    let persons = Object.values(Person).filter((person) => person !== Person.Everyone)
    persons.forEach((person) => {
        debtMap.set(person, new Map<Person, number>())
    })

    spendData.forEach((spend) => {
        totalSpend += spend.convertedCost

        calculateAndUpdateDebtMap(spend, debtMap)
    })

    return {
        totalSpend,
        debtMap,
    }
}

interface ProcessFilteredSpendDataResponse {
    filteredTotalSpend: number
    filteredPeopleTotalSpend: number
    totalSpendByPerson: Map<Person, number>
    totalSpendByType: Map<SpendType, number>
    totalSpendByLocation: Map<Location, number>
}

export const processFilteredSpendData = (
    filteredSpendData: Spend[],
    filteredSpendDataWithoutSplitBetween: Spend[],
    filteredSpendDataWithoutSpendType: Spend[],
    filteredSpendDataWithoutLocation: Spend[],
    splitBetweenFilter: Partial<Record<Person, boolean>>
): ProcessFilteredSpendDataResponse => {
    let filteredTotalSpend = 0
    let filteredPeopleTotalSpend = 0

    const totalSpendByPerson = new Map<Person, number>()
    let persons = Object.values(Person).filter((person) => person !== Person.Everyone)
    persons.forEach((person) => {
        totalSpendByPerson.set(person, 0)
    })

    const totalSpendByType = new Map<SpendType, number>()
    Object.values(SpendType).forEach((type) => {
        totalSpendByType.set(type, 0)
    })

    const totalSpendByLocation = new Map<Location, number>()
    Object.values(Location).forEach((location) => {
        totalSpendByLocation.set(location, 0)
    })

    filteredSpendData.forEach((spend) => {
        filteredPeopleTotalSpend += calculateFilteredTotalSpend(spend, splitBetweenFilter)
    })

    filteredSpendDataWithoutSplitBetween.forEach((spend) => {
        filteredTotalSpend += spend.convertedCost
        calculateAndUpdateTotalSpendByPerson(spend, totalSpendByPerson, splitBetweenFilter)
    })

    filteredSpendDataWithoutSpendType.forEach((spend) => {
        calculateAndUpdateTotalSpendByType(spend, totalSpendByType, splitBetweenFilter)
    })

    filteredSpendDataWithoutLocation.forEach((spend) => {
        calculateAndUpdateTotalSpendByLocation(spend, totalSpendByLocation, splitBetweenFilter)
    })

    return {
        filteredTotalSpend,
        filteredPeopleTotalSpend,
        totalSpendByPerson,
        totalSpendByType,
        totalSpendByLocation,
    }
}

/* Helper functions */

const calculateAndUpdateDebtMap = (spend: Spend, debtMap: Map<Person, Map<Person, number>>) => {
    const { paidBy, convertedCost, splitBetween } = spend

    // get an array of people splitting the cost, exclusive of the payer
    let splitters: Person[] = splitBetween
    if (splitBetween.includes(Person.Everyone)) {
        splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
    }
    splitters = splitters.filter((person) => person !== paidBy)

    splitters.forEach((splitter) => {
        const splitCost = getSplitCost(convertedCost, splitBetween)

        // update splitter's debt
        const splitterDebtMap = getOrCreateDebtMap(splitter, debtMap)
        splitterDebtMap.set(paidBy, (splitterDebtMap.get(paidBy) || 0) + splitCost)
        debtMap.set(splitter, splitterDebtMap)

        // update payer's debt
        const payerDebtMap = getOrCreateDebtMap(paidBy, debtMap)
        payerDebtMap.set(splitter, (payerDebtMap.get(splitter) || 0) - splitCost)
        debtMap.set(paidBy, payerDebtMap)
    })
}

const getOrCreateDebtMap = (person: Person, debtMap: Map<Person, Map<Person, number>>) => {
    let personDebtMap = debtMap.get(person)
    if (!personDebtMap) {
        personDebtMap = new Map<Person, number>()
    }
    return personDebtMap
}

const calculateFilteredTotalSpend = (
    spend: Spend,
    splitBetweenFilter: Partial<Record<Person, boolean>>
): number => {
    const { convertedCost, splitBetween } = spend

    let totalCost = convertedCost

    const isAnyFilterActive = Object.values(splitBetweenFilter).some((isActive) => isActive)
    if (isAnyFilterActive) {
        const splitCost = getSplitCost(convertedCost, splitBetween)

        // get an array of people buying the item
        let splitters: Person[] = splitBetween
        if (splitBetween.includes(Person.Everyone)) {
            splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
        }
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter[person])

        // total cost = split cost * number of people who are buying AND on the filter
        totalCost = splitCost * splitters.length
    }

    return totalCost
}

// calculates total spend for each person for filtered spend data (not including split between)
const calculateAndUpdateTotalSpendByPerson = (
    spend: Spend,
    totalSpendByPerson: Map<Person, number>,
    splitBetweenFilter: Partial<Record<Person, boolean>>
) => {
    const { convertedCost, splitBetween } = spend

    const splitCost = getSplitCost(convertedCost, splitBetween)

    // get an array of people buying the item
    let splitters: Person[] = splitBetween
    if (splitBetween.includes(Person.Everyone)) {
        splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
    }

    splitters.forEach((splitter) => {
        // update splitter's total spend
        totalSpendByPerson.set(splitter, (totalSpendByPerson.get(splitter) || 0) + splitCost)
    })
}

const calculateAndUpdateTotalSpendByType = (
    spend: Spend,
    totalSpendByType: Map<SpendType, number>,
    splitBetweenFilter: Partial<Record<Person, boolean>>
) => {
    const { convertedCost, splitBetween, type } = spend

    let totalCost = convertedCost

    const isAnyFilterActive = Object.values(splitBetweenFilter).some((isActive) => isActive)
    if (isAnyFilterActive) {
        const splitCost = getSplitCost(convertedCost, splitBetween)

        // get an array of people buying the item
        let splitters: Person[] = splitBetween
        if (splitBetween.includes(Person.Everyone)) {
            splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
        }
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter[person])

        // total cost = split cost * number of people who are buying AND on the filter
        totalCost = splitCost * splitters.length
    }

    if (type) {
        totalSpendByType.set(type, (totalSpendByType.get(type) || 0) + totalCost)
    }
    // if no spend type was reported, group it with 'Other'
    else {
        totalSpendByType.set(
            SpendType.Other,
            (totalSpendByType.get(SpendType.Other) || 0) + totalCost
        )
    }
}

const calculateAndUpdateTotalSpendByLocation = (
    spend: Spend,
    totalSpendByLocation: Map<Location, number>,
    splitBetweenFilter: Partial<Record<Person, boolean>>
) => {
    const { convertedCost, splitBetween, location } = spend

    let totalCost = convertedCost

    const isAnyFilterActive = Object.values(splitBetweenFilter).some((isActive) => isActive)
    if (isAnyFilterActive) {
        const splitCost = getSplitCost(convertedCost, splitBetween)

        // get an array of people buying the item
        let splitters: Person[] = splitBetween
        if (splitBetween.includes(Person.Everyone)) {
            splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
        }
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter[person])

        // total cost = split cost * number of people who are buying AND on the filter
        totalCost = splitCost * splitters.length
    }

    if (location && Object.values(Location).includes(location)) {
        totalSpendByLocation.set(location, (totalSpendByLocation.get(location) || 0) + totalCost)
    } else {
        totalSpendByLocation.set(
            Location.Other,
            (totalSpendByLocation.get(Location.Other) || 0) + totalCost
        )
    }
}
