import { Trip } from 'helpers/trips'
import AibekImage from '../images/people/aibek.jpg'
import AngelaImage from '../images/people/angela.jpg'
import DennisImage from '../images/people/dennis.jpg'
import IvanImage from '../images/people/ivan.jpg'
import JennyImage from '../images/people/jenny.jpg'
import JoannaImage from '../images/people/joanna.jpg'
import LisaImage from '../images/people/lisa.jpg'
import MichelleImage from '../images/people/michelle.jpg'

export enum Person {
    Everyone = 'Everyone',
    Aibek = 'Aibek',
    Angela = 'Angela',
    Dennis = 'Dennis',
    Ivan = 'Ivan',
    Jenny = 'Jenny',
    Joanna = 'Joanna',
    Lisa = 'Lisa',
    Michelle = 'Michelle',
    Suming = 'Suming', // Michelle's mom
}

export const PeopleByTrip = {
    [Trip.Japan2024]: [
        Person.Aibek,
        Person.Angela,
        Person.Ivan,
        Person.Jenny,
        Person.Joanna,
        Person.Lisa,
        Person.Michelle,
        Person.Suming,
    ],
    [Trip.Vancouver2024]: [
        Person.Angela,
        Person.Dennis,
        Person.Ivan,
        Person.Jenny,
        Person.Lisa,
    ],
}

export const getPersonInitials = (person: Person): string => {
    switch (person) {
        case Person.Everyone:
            return 'EV'
        case Person.Aibek:
            return 'AS'
        case Person.Angela:
            return 'AM'
        case Person.Dennis:
            return 'DM'
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

export const getPersonImage = (person: Person) => {
    switch (person) {
        case Person.Aibek:
            return AibekImage
        case Person.Angela:
            return AngelaImage
        case Person.Dennis:
            return DennisImage
        case Person.Ivan:
            return IvanImage
        case Person.Jenny:
            return JennyImage
        case Person.Joanna:
            return JoannaImage
        case Person.Lisa:
            return LisaImage
        case Person.Michelle:
            return MichelleImage
        default:
            return undefined
    }
}

export const getPersonFromEmail = (email: string): Person | undefined => {
    switch (email) {
        case 'aibek.asm@gmail.com':
            return Person.Aibek
        case 'angela.moy48@gmail.com':
            return Person.Angela
        case 'dennismoy18@gmail.com':
            return Person.Dennis
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

export const getVenmoUrl = (person: Person): string => {
    switch (person) {
        case Person.Aibek:
            return 'https://account.venmo.com/u/Aibek-Sarbayev'
        case Person.Angela:
            return 'https://account.venmo.com/u/takoyuki'
        case Person.Ivan:
            return 'https://account.venmo.com/u/iwong3'
        // return 'venmo://paycharge?txn=pay&recipients=iwong3'
        case Person.Jenny:
            return 'https://account.venmo.com/u/Jenny-Mei-1'
        case Person.Joanna:
            return 'https://account.venmo.com/u/Joanna-Mei'
        case Person.Michelle:
            return 'https://account.venmo.com/u/Michellec_8'
        default:
            return ''
    }
}
