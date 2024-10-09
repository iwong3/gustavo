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

export const getPersonFromEmail = (email: string): Person | undefined => {
    switch (email) {
        case 'aibek.asm@gmail.com':
            return Person.Aibek
        case 'angela.moy48@gmail.com':
            return Person.Angela
        case 'ivanwong15@gmail.com':
            return Person.Ivan
        case 'jennyjiayimei@gmail.com':
            return Person.Jenny
        case 'joannamei11@gmail.com':
            return Person.Joanna
        case 'michellec0897@gmail.com':
            return Person.Michelle
        default:
            break
    }
}

export const getPersonInitials = (person: Person): string => {
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

export const getVenmoUrl = (person: Person): string => {
    switch (person) {
        case Person.Aibek:
            return 'https://account.venmo.com/u/Aibek-Sarbayev'
        case Person.Angela:
            return 'https://account.venmo.com/u/takoyuki'
        case Person.Ivan:
            return 'https://account.venmo.com/u/iwong3'
        case Person.Jenny:
            return 'https://account.venmo.com/u/Jenny-Mei-1'
        case Person.Joanna:
            return 'https://account.venmo.com/u/Joanna-Mei'
        case Person.Lisa:
            return ''
        case Person.Michelle:
            return 'https://account.venmo.com/u/Michellec_8'
        case Person.Suming:
            return ''
        default:
            return ''
    }
}
