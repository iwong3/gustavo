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
    type: SpendType
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
    MichellesMom = "Michelle's Mom",
}

export type Currency = 'USD' | 'YEN'

export enum SpendType {
    Attraction = 'Attraction',
    Commute = 'Commute',
    Food = 'Food',
    Hotel = 'Hotel',
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
            return 'AI'
        case Person.Angela:
            return 'AN'
        case Person.Ivan:
            return 'IV'
        case Person.Jenny:
            return 'JE'
        case Person.Joanna:
            return 'JO'
        case Person.Lisa:
            return 'LI'
        case Person.Michelle:
            return 'MI'
        case Person.MichellesMom:
            return 'MM'
        default:
            return ''
    }
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
