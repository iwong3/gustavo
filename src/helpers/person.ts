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
