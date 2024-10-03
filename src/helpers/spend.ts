export enum Columns {
    Cost = 'Cost',
    Currency = 'Currency',
    Date = 'Date',
    ItemName = 'Item Name',
    Location = 'Location',
    PaidBy = 'Paid By',
    Email = 'Email Address',
    SplitBetween = 'Split Between',
    SpendType = 'Type of Spend',
}

export interface Spend {
    date: string
    name: string
    cost: number
    currency: Currency
    paidBy: Person
    splitBetween: Person[]
    location: string
    type: SpendType | undefined
    reportedBy: Person | undefined
}

export enum Person {
    Everyone = 'Everyone',
    Aibek = 'Aibek',
    Angela = 'Angela',
    Ivan = 'Ivan',
    Jenny = 'Jenny',
    Joanna = 'Joanna',
    Lisa = 'Lisa',
    Michelle = 'Michelle',
    Suming = 'Suming', // Michelle's mom
}

export type Currency = 'USD' | 'JPY'

export enum SpendType {
    Attraction = 'Attraction',
    Commute = 'Commute',
    Food = 'Food',
    Lodging = 'Lodging',
    Other = 'Other',
    Souvenir = 'Souvenir',
}

export const getPersonFromEmail = (email: string): Person | undefined => {
    switch (email) {
        case 'ivanwong15@gmail.com':
            return Person.Ivan
        case 'jennyjiayimei@gmail.com':
            return Person.Jenny
        default:
            break
    }
}

export const getInitials = (person: Person): string => {
    switch (person) {
        case Person.Everyone:
            return 'EV'
        case Person.Aibek:
            return 'AS'
        case Person.Angela:
            return 'AM'
        case Person.Ivan:
            return 'IW'
        case Person.Jenny:
            return 'JY'
        case Person.Joanna:
            return 'JO'
        case Person.Lisa:
            return 'LM'
        case Person.Michelle:
            return 'MC'
        case Person.Suming:
            return 'SL'
        default:
            return ''
    }
}

export const getSplitCost = (cost: number, splitBetween: Person[]): number => {
    if (splitBetween[0] === Person.Everyone) {
        return cost / 8
    }
    return cost / splitBetween.length
}

export const parseRow = (row: string): string[] => {
    const rowValues: string[] = []

    let currentStr = ''
    let inQuotes = false
    for (let i = 0; i < row.length; i++) {
        const char = row[i]
        if (char === '"') {
            inQuotes = !inQuotes
            continue
        }
        if (inQuotes) {
            currentStr += char
            continue
        }
        if (char === ',') {
            rowValues.push(currentStr)
            currentStr = ''
            continue
        }
        currentStr += char
    }
    rowValues.push(currentStr)

    return rowValues
}

export const USDollar = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
})

export const FormattedMoney = (currency: string = 'USD', digits: number = 2) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: digits,
    })
}
