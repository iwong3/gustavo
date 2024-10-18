export enum Location {
    Hakone = 'Hakone',
    Kyoto = 'Kyoto',
    Osaka = 'Osaka',
    Tokyo = 'Tokyo',
    Other = 'Other',
}

export const getLocationAbbr = (location: Location): string => {
    switch (location) {
        case Location.Hakone:
            return 'Ha'
        case Location.Kyoto:
            return 'Ky'
        case Location.Osaka:
            return 'Os'
        case Location.Tokyo:
            return 'To'
        case Location.Other:
            return '?'
    }
}
