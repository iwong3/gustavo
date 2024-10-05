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
    Commute = 'Commute',
    Food = 'Food',
    Lodging = 'Lodging',
    Souvenir = 'Souvenir',
    Other = 'Other',
}

export const getSplitCost = (cost: number, splitBetween: Person[]): number => {
    if (splitBetween[0] === Person.Everyone) {
        return cost / 8
    }
    return cost / splitBetween.length
}
