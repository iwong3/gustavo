import { Currency } from 'utils/currency'
import { Location } from 'utils/location'
import { PeopleByTrip, Person } from 'utils/person'
import { Trip } from 'utils/trips'

/**
 * For everything related to spend
 * This includes anything needed to show row data
 */

export interface Spend {
    trip: Trip
    name: string
    date: string
    originalCost: number
    currency: Currency
    convertedCost: number // calculated from original cost, currency, and date
    paidBy: Person
    splitBetween: Person[]
    location: Location | undefined
    type: SpendType | undefined
    notes: string
    reportedBy: Person | undefined
    reportedAt: string | undefined
    receiptImageUrl: string | undefined
    error: boolean
}

export enum SpendType {
    Attraction = 'Attraction',
    Food = 'Food',
    Lodging = 'Lodging',
    Shopping = 'Shopping',
    Transit = 'Transit',
    Other = 'Other',
}

export const getSpendTypeLabel = (type: SpendType): string => {
    switch (type) {
        case SpendType.Attraction:
            return 'Attraction'
        case SpendType.Food:
            return 'Food'
        case SpendType.Lodging:
            return 'Lodging'
        case SpendType.Shopping:
            return 'Shopping'
        case SpendType.Transit:
            return 'Transit'
        case SpendType.Other:
            return 'Other'
    }
}

export const getSplitCost = (
    cost: number,
    splitBetween: Person[],
    trip: Trip
): number => {
    if (splitBetween.includes(Person.Everyone)) {
        return cost / PeopleByTrip[trip].length
    }
    return cost / splitBetween.length
}
