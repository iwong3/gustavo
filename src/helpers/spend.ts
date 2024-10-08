import { Currency } from 'helpers/currency'
import { Person } from 'helpers/person'

/**
 * For everything related to spend
 * This includes anything needed to show row data
 */

export interface Spend {
    name: string
    date: string
    originalCost: number
    currency: Currency
    convertedCost: number // calculated from original cost, currency, and date
    paidBy: Person
    splitBetween: Person[]
    location: string
    type: SpendType | undefined
    reportedBy: Person | undefined
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

export const getSplitCost = (cost: number, splitBetween: Person[]): number => {
    if (splitBetween.includes(Person.Everyone)) {
        return cost / 8
    }
    return cost / splitBetween.length
}
