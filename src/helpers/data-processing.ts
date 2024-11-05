import dayjs from 'dayjs'
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
    totalSpendByDate: Map<string, number>
    totalSpendByDateByPerson: Map<Person, Map<string, number>>
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

    const totalSpendByDate = new Map<string, number>()

    const totalSpendByDateByPerson = new Map<Person, Map<string, number>>()
    persons.forEach((person) => {
        totalSpendByDateByPerson.set(person, new Map<string, number>())
    })

    let earliestDate = filteredSpendData.length > 0 ? dayjs(filteredSpendData[0].date) : null
    let latestDate = earliestDate

    filteredSpendData.forEach((spend) => {
        filteredPeopleTotalSpend += calculateFilteredTotalSpend(spend, splitBetweenFilter)

        const currentDate = dayjs(spend.date)
        if (currentDate.isBefore(earliestDate)) {
            earliestDate = currentDate
        }
        if (currentDate.isAfter(latestDate)) {
            latestDate = currentDate
        }

        calculateAndUpdateTotalSpendByDate(spend, totalSpendByDate, splitBetweenFilter)

        calculateAndUpdateTotalSpendByDateByPerson(
            spend,
            totalSpendByDateByPerson,
            splitBetweenFilter
        )
    })

    filteredSpendDataWithoutSplitBetween.forEach((spend) => {
        filteredTotalSpend += spend.convertedCost

        calculateAndUpdateTotalSpendByPerson(spend, totalSpendByPerson)

        // calculateAndUpdateTotalSpendByDateByPerson(
        //     spend,
        //     totalSpendByDateByPerson,
        //     splitBetweenFilter
        // )
    })

    filteredSpendDataWithoutSpendType.forEach((spend) => {
        calculateAndUpdateTotalSpendByType(spend, totalSpendByType, splitBetweenFilter)
    })

    filteredSpendDataWithoutLocation.forEach((spend) => {
        calculateAndUpdateTotalSpendByLocation(spend, totalSpendByLocation, splitBetweenFilter)
    })

    // populate all dates between earliest and latest date
    if (filteredSpendData.length > 0 && earliestDate) {
        let currentDate = earliestDate
        while (currentDate.isBefore(latestDate, 'day') || currentDate.isSame(latestDate, 'day')) {
            const currentDateString = currentDate.format('YYYY/MM/DD')

            if (!totalSpendByDate.has(currentDateString)) {
                totalSpendByDate.set(currentDateString, 0)
            }

            persons.forEach((person) => {
                const currentSplitterTotalSpendByDate = totalSpendByDateByPerson.get(person)!
                if (!currentSplitterTotalSpendByDate.has(currentDateString)) {
                    currentSplitterTotalSpendByDate.set(currentDateString, 0)
                }
            })

            currentDate = currentDate.add(1, 'day')
        }
    }

    return {
        filteredTotalSpend,
        filteredPeopleTotalSpend,
        totalSpendByPerson,
        totalSpendByType,
        totalSpendByLocation,
        totalSpendByDate,
        totalSpendByDateByPerson,
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
    totalSpendByPerson: Map<Person, number>
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

const calculateAndUpdateTotalSpendByDate = (
    spend: Spend,
    totalSpendByDate: Map<string, number>,
    splitBetweenFilter: Partial<Record<Person, boolean>>
) => {
    const { convertedCost, splitBetween, date } = spend

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

    const currentDate = dayjs(date)
    const currentDateString = currentDate.format('YYYY/MM/DD')
    totalSpendByDate.set(
        currentDateString,
        (totalSpendByDate.get(currentDateString) || 0) + totalCost
    )
}

const calculateAndUpdateTotalSpendByDateByPerson = (
    spend: Spend,
    totalSpendByDateByPerson: Map<Person, Map<string, number>>,
    splitBetweenFilter: Partial<Record<Person, boolean>>
) => {
    const { convertedCost, splitBetween, date } = spend

    const splitCost = getSplitCost(convertedCost, splitBetween)
    const currentDate = dayjs(date)
    const currentDateString = currentDate.format('YYYY/MM/DD')

    // get an array of people buying the item
    let splitters: Person[] = splitBetween
    if (splitBetween.includes(Person.Everyone)) {
        splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
    }

    const isAnyFilterActive = Object.values(splitBetweenFilter).some((isActive) => isActive)
    if (isAnyFilterActive) {
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter[person])
    }

    splitters.forEach((splitter) => {
        const currentSplitterTotalSpendByDate = totalSpendByDateByPerson.get(splitter)!
        currentSplitterTotalSpendByDate.set(
            currentDateString,
            (currentSplitterTotalSpendByDate.get(currentDateString) || 0) + splitCost
        )

        // update splitter's total spend
        totalSpendByDateByPerson.set(splitter, currentSplitterTotalSpendByDate)
    })
}

export const ErrorConvertingToUSD = 'Could not convert to USD'
