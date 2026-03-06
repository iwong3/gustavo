/**
 * Google Sheets URLs.
 * Used by utils/links.ts for the external links panel (itinerary, Google Maps
 * list, submit receipts form, etc.).
 *
 * Keyed by trip slug (matching the URL slug used in routing).
 */

type Urls = {
    GoogleFormUrl: string
    GoogleSheetUrl: string
    ItineraryUrl?: string
    GoogleMapsListUrl?: string
}

export const ViewPath = '/edit?usp=sharing'

export const UrlsByTripSlug: Record<string, Urls> = {
    'japan-2024': {
        GoogleFormUrl:
            'https://docs.google.com/forms/d/e/1FAIpQLSfe5IVFIuHjSET8PODYR77_S5Rrmts5XVM_7PktQT92Gs2Xwg/viewform',
        GoogleSheetUrl:
            'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs',
        ItineraryUrl:
            'https://docs.google.com/document/d/1iIY1KnyAPzlT0qmRseU8t8R58N7dUC_zzyyJ3bWafnI/edit?usp=sharing',
        GoogleMapsListUrl: 'https://maps.app.goo.gl/v9AbZK6PaY2d7SVU9',
    },
    'vancouver-2024': {
        GoogleFormUrl:
            'https://docs.google.com/forms/d/e/1FAIpQLScCLM3JLZEFFnxEhhzsUe29RBVpmU9gKy649ZHUwpTFLsJJ-A/viewform',
        GoogleSheetUrl:
            'https://docs.google.com/spreadsheets/d/1O1xY4t9RDgKMZWIle644wH1PZEi17LqnU1DI5hJjB6c',
    },
    'south-korea-2025': {
        GoogleFormUrl:
            'https://docs.google.com/forms/d/e/1FAIpQLSd9dkTzTvlMlzY_qTjx82wzzHn7QqOgTxHyukda-aIuIzizjg/viewform',
        GoogleSheetUrl:
            'https://docs.google.com/spreadsheets/d/1F17bXpBHHl3sAhNx6jBipb_9BdObN63iiyLenWjL-EU',
    },
    'japan-2025': {
        GoogleFormUrl:
            'https://docs.google.com/forms/d/e/1FAIpQLSe8QwWui7SpG0QXX6PQIJMx5U8wh89rVHH-5L0S7NnKoJBRhg/viewform',
        GoogleSheetUrl:
            'https://docs.google.com/spreadsheets/d/19gPJSY_eAvU7FtkRKu1BvyXnKv9wi8ylo4BLpmYY9i4',
        ItineraryUrl:
            'https://docs.google.com/document/d/1ssvH0nLXnuwmWRd1GiVpIB7levpJOPV4r2k5joHhs-E/edit?usp=sharing',
        GoogleMapsListUrl: 'https://maps.app.goo.gl/MqABJGghqZjMbyok7',
    },
}
