import { Trip } from 'helpers/trips'

export enum Location {
    // Japan
    Hakone = 'Hakone',
    Kyoto = 'Kyoto',
    Osaka = 'Osaka',
    Tokyo = 'Tokyo',
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
}

export const getLocationAbbr = (location: Location): string => {
    switch (location) {
        // Japan
        case Location.Hakone:
            return 'HA'
        case Location.Kyoto:
            return 'KY'
        case Location.Osaka:
            return 'OS'
        case Location.Tokyo:
            return 'TO'
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
