import dayjs from 'dayjs'

import { Location, LocationByTrip } from 'helpers/location'
import { PeopleByTrip, Person } from 'helpers/person'
import { getSplitCost, Spend, SpendType } from 'helpers/spend'
import { Trip } from 'helpers/trips'

interface ProcessSpendDataResponse {
    totalSpend: number
    debtMap: Map<Person, Map<Person, number>>
}

export const processSpendData = (
    spendData: Spend[],
    trip: Trip
): ProcessSpendDataResponse => {
    let totalSpend = 0

    // initialize debt map
    const debtMap = new Map<Person, Map<Person, number>>()
    let people = PeopleByTrip[trip]
    people.forEach((person) => {
        debtMap.set(person, new Map<Person, number>())
    })

    spendData.forEach((spend) => {
        totalSpend += spend.convertedCost

        calculateAndUpdateDebtMap(spend, debtMap, trip)
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
    splitBetweenFilter: Map<Person, boolean>,
    trip: Trip
): ProcessFilteredSpendDataResponse => {
    let filteredTotalSpend = 0
    let filteredPeopleTotalSpend = 0

    const totalSpendByPerson = new Map<Person, number>()
    let people = PeopleByTrip[trip]
    people.forEach((person) => {
        totalSpendByPerson.set(person, 0)
    })

    const totalSpendByType = new Map<SpendType, number>()
    Object.values(SpendType).forEach((type) => {
        totalSpendByType.set(type, 0)
    })

    const totalSpendByLocation = new Map<Location, number>()
    let locations = LocationByTrip[trip]
    locations.forEach((location) => {
        totalSpendByLocation.set(location, 0)
    })

    const totalSpendByDate = new Map<string, number>()

    const totalSpendByDateByPerson = new Map<Person, Map<string, number>>()
    people.forEach((person) => {
        totalSpendByDateByPerson.set(person, new Map<string, number>())
    })

    let earliestDate =
        filteredSpendData.length > 0 ? dayjs(filteredSpendData[0].date) : null
    let latestDate = earliestDate

    filteredSpendData.forEach((spend) => {
        filteredPeopleTotalSpend += calculateFilteredTotalSpend(
            spend,
            splitBetweenFilter,
            trip
        )

        const currentDate = dayjs(spend.date)
        if (currentDate.isBefore(earliestDate)) {
            earliestDate = currentDate
        }
        if (currentDate.isAfter(latestDate)) {
            latestDate = currentDate
        }

        calculateAndUpdateTotalSpendByDate(
            spend,
            totalSpendByDate,
            splitBetweenFilter,
            trip
        )

        calculateAndUpdateTotalSpendByDateByPerson(
            spend,
            totalSpendByDateByPerson,
            splitBetweenFilter,
            trip
        )
    })

    filteredSpendDataWithoutSplitBetween.forEach((spend) => {
        filteredTotalSpend += spend.convertedCost

        calculateAndUpdateTotalSpendByPerson(spend, totalSpendByPerson, trip)
    })

    filteredSpendDataWithoutSpendType.forEach((spend) => {
        calculateAndUpdateTotalSpendByType(
            spend,
            totalSpendByType,
            splitBetweenFilter,
            trip
        )
    })

    filteredSpendDataWithoutLocation.forEach((spend) => {
        calculateAndUpdateTotalSpendByLocation(
            spend,
            totalSpendByLocation,
            splitBetweenFilter,
            trip
        )
    })

    // populate all dates between earliest and latest date
    if (filteredSpendData.length > 0 && earliestDate) {
        let currentDate = earliestDate
        while (
            currentDate.isBefore(latestDate, 'day') ||
            currentDate.isSame(latestDate, 'day')
        ) {
            const currentDateString = currentDate.format('YYYY/MM/DD')

            if (!totalSpendByDate.has(currentDateString)) {
                totalSpendByDate.set(currentDateString, 0)
            }

            people.forEach((person) => {
                const currentSplitterTotalSpendByDate =
                    totalSpendByDateByPerson.get(person)!
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

const calculateAndUpdateDebtMap = (
    spend: Spend,
    debtMap: Map<Person, Map<Person, number>>,
    trip: Trip
) => {
    const { paidBy, convertedCost, splitBetween } = spend

    // get an array of people splitting the cost, exclusive of the payer
    let splitters: Person[] = splitBetween
    if (splitBetween.includes(Person.Everyone)) {
        splitters = Array.from(debtMap.keys())
    }
    splitters = splitters.filter((person) => person !== paidBy)

    splitters.forEach((splitter) => {
        const splitCost = getSplitCost(convertedCost, splitBetween, trip)

        // update splitter's debt
        const splitterDebtMap = getOrCreateDebtMap(splitter, debtMap)
        splitterDebtMap.set(
            paidBy,
            (splitterDebtMap.get(paidBy) || 0) + splitCost
        )
        debtMap.set(splitter, splitterDebtMap)

        // update payer's debt
        const payerDebtMap = getOrCreateDebtMap(paidBy, debtMap)
        payerDebtMap.set(
            splitter,
            (payerDebtMap.get(splitter) || 0) - splitCost
        )
        debtMap.set(paidBy, payerDebtMap)
    })
}

const getOrCreateDebtMap = (
    person: Person,
    debtMap: Map<Person, Map<Person, number>>
) => {
    let personDebtMap = debtMap.get(person)
    if (!personDebtMap) {
        personDebtMap = new Map<Person, number>()
    }
    return personDebtMap
}

const calculateFilteredTotalSpend = (
    spend: Spend,
    splitBetweenFilter: Map<Person, boolean>,
    trip: Trip
): number => {
    const { convertedCost, splitBetween } = spend

    let totalCost = convertedCost

    const isAnyFilterActive = Object.values(splitBetweenFilter).some(
        (isActive) => isActive
    )
    if (isAnyFilterActive) {
        const splitCost = getSplitCost(convertedCost, splitBetween, trip)

        // get an array of people buying the item
        let splitters: Person[] = splitBetween
        if (splitBetween.includes(Person.Everyone)) {
            splitters = Array.from(splitBetweenFilter.keys())
        }
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter.get(person))

        // total cost = split cost * number of people who are buying AND on the filter
        totalCost = splitCost * splitters.length
    }

    return totalCost
}

// calculates total spend for each person for filtered spend data (not including split between)
const calculateAndUpdateTotalSpendByPerson = (
    spend: Spend,
    totalSpendByPerson: Map<Person, number>,
    trip: Trip
) => {
    const { convertedCost, splitBetween } = spend

    const splitCost = getSplitCost(convertedCost, splitBetween, trip)

    // get an array of people buying the item
    let splitters: Person[] = splitBetween
    if (splitBetween.includes(Person.Everyone)) {
        splitters = Array.from(totalSpendByPerson.keys())
    }

    splitters.forEach((splitter) => {
        // update splitter's total spend
        totalSpendByPerson.set(
            splitter,
            (totalSpendByPerson.get(splitter) || 0) + splitCost
        )
    })
}

const calculateAndUpdateTotalSpendByType = (
    spend: Spend,
    totalSpendByType: Map<SpendType, number>,
    splitBetweenFilter: Map<Person, boolean>,
    trip: Trip
) => {
    const { convertedCost, splitBetween, type } = spend

    let totalCost = convertedCost

    const isAnyFilterActive = Object.values(splitBetweenFilter).some(
        (isActive) => isActive
    )
    if (isAnyFilterActive) {
        const splitCost = getSplitCost(convertedCost, splitBetween, trip)

        // get an array of people buying the item
        let splitters: Person[] = splitBetween
        if (splitBetween.includes(Person.Everyone)) {
            splitters = Array.from(splitBetweenFilter.keys())
        }
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter.get(person))

        // total cost = split cost * number of people who are buying AND on the filter
        totalCost = splitCost * splitters.length
    }

    if (type) {
        totalSpendByType.set(
            type,
            (totalSpendByType.get(type) || 0) + totalCost
        )
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
    splitBetweenFilter: Map<Person, boolean>,
    trip: Trip
) => {
    const { convertedCost, splitBetween, location } = spend

    let totalCost = convertedCost

    const isAnyFilterActive = Object.values(splitBetweenFilter).some(
        (isActive) => isActive
    )
    if (isAnyFilterActive) {
        const splitCost = getSplitCost(convertedCost, splitBetween, trip)

        // get an array of people buying the item
        let splitters: Person[] = splitBetween
        if (splitBetween.includes(Person.Everyone)) {
            splitters = Array.from(splitBetweenFilter.keys())
        }
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter.get(person))

        // total cost = split cost * number of people who are buying AND on the filter
        totalCost = splitCost * splitters.length
    }

    if (location && Object.values(Location).includes(location)) {
        totalSpendByLocation.set(
            location,
            (totalSpendByLocation.get(location) || 0) + totalCost
        )
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
    splitBetweenFilter: Map<Person, boolean>,
    trip: Trip
) => {
    const { convertedCost, splitBetween, date } = spend

    let totalCost = convertedCost

    const isAnyFilterActive = Object.values(splitBetweenFilter).some(
        (isActive) => isActive
    )
    if (isAnyFilterActive) {
        const splitCost = getSplitCost(convertedCost, splitBetween, trip)

        // get an array of people buying the item
        let splitters: Person[] = splitBetween
        if (splitBetween.includes(Person.Everyone)) {
            splitters = Array.from(splitBetweenFilter.keys())
        }
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter.get(person))

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
    splitBetweenFilter: Map<Person, boolean>,
    trip: Trip
) => {
    const { convertedCost, splitBetween, date } = spend

    const splitCost = getSplitCost(convertedCost, splitBetween, trip)
    const currentDate = dayjs(date)
    const currentDateString = currentDate.format('YYYY/MM/DD')

    // get an array of people buying the item
    let splitters: Person[] = splitBetween
    if (splitBetween.includes(Person.Everyone)) {
        splitters = Array.from(splitBetweenFilter.keys())
    }

    const isAnyFilterActive = Object.values(splitBetweenFilter).some(
        (isActive) => isActive
    )
    if (isAnyFilterActive) {
        // remove people who are not selected on the filter
        splitters = splitters.filter((person) => splitBetweenFilter.get(person))
    }

    splitters.forEach((splitter) => {
        const currentSplitterTotalSpendByDate =
            totalSpendByDateByPerson.get(splitter)!
        currentSplitterTotalSpendByDate.set(
            currentDateString,
            (currentSplitterTotalSpendByDate.get(currentDateString) || 0) +
                splitCost
        )

        // update splitter's total spend
        totalSpendByDateByPerson.set(splitter, currentSplitterTotalSpendByDate)
    })
}

export const ErrorConvertingToUSDGeneral = 'Could not convert some data to USD'
export const ErrorConvertingToUSDRow = 'Could not convert to USD'
