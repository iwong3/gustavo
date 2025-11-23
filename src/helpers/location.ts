import { Trip } from 'helpers/trips'

export enum Location {
    // Japan
    Hakone = 'Hakone',
    Hiroshima = 'Hiroshima',
    Kawaguchiko = 'Kawaguchiko',
    Kyoto = 'Kyoto',
    Osaka = 'Osaka',
    Tokyo = 'Tokyo',
    Uji = 'Uji',
    // Vancouver
    Vancouver = 'Vancouver',
    // South Korea
    Seoul = 'Seoul',
    // Other
    Other = 'Other',
}

export const LocationByTrip = {
    [Trip.Japan2024]: [
        Location.Hakone,
        Location.Kyoto,
        Location.Osaka,
        Location.Tokyo,
        Location.Other,
    ],
    [Trip.Vancouver2024]: [Location.Vancouver, Location.Other],
    [Trip.SouthKorea2025]: [Location.Seoul, Location.Other],
    [Trip.Japan2025]: [
        Location.Hiroshima,
        Location.Kawaguchiko,
        Location.Kyoto,
        Location.Tokyo,
        Location.Uji,
        Location.Other,
    ],
}

export const getLocationAbbr = (location: Location): string => {
    switch (location) {
        // Japan
        case Location.Hakone:
            return 'HA'
        case Location.Hiroshima:
            return 'HI'
        case Location.Kawaguchiko:
            return 'KA'
        case Location.Kyoto:
            return 'KY'
        case Location.Osaka:
            return 'OS'
        case Location.Tokyo:
            return 'TO'
        case Location.Uji:
            return 'UJ'
        // Vancouver
        case Location.Vancouver:
            return 'VA'
        // South Korea
        case Location.Seoul:
            return 'SE'
        // Other
        case Location.Other:
            return '?'
    }
}
