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

export enum Person {
    Everyone = 'Everyone',
    Aibek = 'Aibek',
    Angela = 'Angela',
    Ivan = 'Ivan',
    Jenny = 'Jenny',
    Joanna = 'Joanna',
    Michelle = 'Michelle',
    MichellesMom = "Michelle's Mom",
}

export type Currency = 'USD' | 'YEN'

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
