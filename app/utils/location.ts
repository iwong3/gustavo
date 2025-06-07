import { Trip } from 'utils/trips'

export enum Location {
    Hakone = 'Hakone',
    Kyoto = 'Kyoto',
    Osaka = 'Osaka',
    Tokyo = 'Tokyo',
    Vancouver = 'Vancouver',
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
}

export const getLocationAbbr = (location: Location): string => {
    switch (location) {
        case Location.Hakone:
            return 'HA'
        case Location.Kyoto:
            return 'KY'
        case Location.Osaka:
            return 'OS'
        case Location.Tokyo:
            return 'TO'
        case Location.Vancouver:
            return 'VA'
        case Location.Other:
            return '?'
    }
}
