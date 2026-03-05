import { Trip } from 'utils/trips'

export enum Location {
    // Japan
    Hakone = 'Hakone',
    Hiroshima = 'Hiroshima',
    Kawaguchiko = 'Kawaguchiko',
    Kyoto = 'Kyoto',
    Miyajima = 'Miyajima',
    Nara = 'Nara',
    Osaka = 'Osaka',
    Tokyo = 'Tokyo',
    Uji = 'Uji',
    // Vancouver
    Squamish = 'Squamish',
    Vancouver = 'Vancouver',
    // South Korea
    SanFrancisco = 'San Francisco',
    Seoul = 'Seoul',
    // Other
    Other = 'Other',
}

export const LocationByTrip = {
    [Trip.Japan2024]: [
        Location.Hakone,
        Location.Kyoto,
        Location.Nara,
        Location.Osaka,
        Location.Tokyo,
        Location.Other,
    ],
    [Trip.Vancouver2024]: [Location.Squamish, Location.Vancouver, Location.Other],
    [Trip.SouthKorea2025]: [Location.SanFrancisco, Location.Seoul, Location.Other],
    [Trip.Japan2025]: [
        Location.Hiroshima,
        Location.Kawaguchiko,
        Location.Kyoto,
        Location.Miyajima,
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
        case Location.Miyajima:
            return 'MI'
        case Location.Nara:
            return 'NA'
        case Location.Uji:
            return 'UJ'
        // Vancouver
        case Location.Squamish:
            return 'SQ'
        case Location.Vancouver:
            return 'VA'
        // South Korea
        case Location.SanFrancisco:
            return 'SF'
        case Location.Seoul:
            return 'SE'
        // Other
        case Location.Other:
            return '?'
    }
}
