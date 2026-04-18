/**
 * Country → currency reference data.
 *
 * Used at trip creation: user picks countries, app derives the trip's
 * available currencies from this map (plus USD, always implicit).
 *
 * Edit this file to add new countries or correct mappings — no DB migration
 * needed. Country codes are ISO 3166-1 alpha-2; currency codes are ISO 4217.
 *
 * Eurozone, USD-using territories, etc. are listed individually so the user
 * picks an actual country, not a currency.
 */

export type Country = {
    code: string      // ISO 3166-1 alpha-2 (e.g. "JP")
    name: string      // display name
    currency: string  // ISO 4217 (e.g. "JPY")
    flag: string      // emoji flag for UI
}

export const COUNTRIES: Country[] = [
    // North America
    { code: 'US', name: 'United States', currency: 'USD', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', currency: 'CAD', flag: '🇨🇦' },
    { code: 'MX', name: 'Mexico', currency: 'MXN', flag: '🇲🇽' },

    // East Asia
    { code: 'JP', name: 'Japan', currency: 'JPY', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', currency: 'KRW', flag: '🇰🇷' },
    { code: 'CN', name: 'China', currency: 'CNY', flag: '🇨🇳' },
    { code: 'TW', name: 'Taiwan', currency: 'TWD', flag: '🇹🇼' },
    { code: 'HK', name: 'Hong Kong', currency: 'HKD', flag: '🇭🇰' },

    // Southeast Asia
    { code: 'TH', name: 'Thailand', currency: 'THB', flag: '🇹🇭' },
    { code: 'VN', name: 'Vietnam', currency: 'VND', flag: '🇻🇳' },
    { code: 'SG', name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
    { code: 'MY', name: 'Malaysia', currency: 'MYR', flag: '🇲🇾' },
    { code: 'ID', name: 'Indonesia', currency: 'IDR', flag: '🇮🇩' },
    { code: 'PH', name: 'Philippines', currency: 'PHP', flag: '🇵🇭' },

    // South Asia
    { code: 'IN', name: 'India', currency: 'INR', flag: '🇮🇳' },

    // Eurozone
    { code: 'AT', name: 'Austria', currency: 'EUR', flag: '🇦🇹' },
    { code: 'BE', name: 'Belgium', currency: 'EUR', flag: '🇧🇪' },
    { code: 'DE', name: 'Germany', currency: 'EUR', flag: '🇩🇪' },
    { code: 'ES', name: 'Spain', currency: 'EUR', flag: '🇪🇸' },
    { code: 'FI', name: 'Finland', currency: 'EUR', flag: '🇫🇮' },
    { code: 'FR', name: 'France', currency: 'EUR', flag: '🇫🇷' },
    { code: 'GR', name: 'Greece', currency: 'EUR', flag: '🇬🇷' },
    { code: 'IE', name: 'Ireland', currency: 'EUR', flag: '🇮🇪' },
    { code: 'IT', name: 'Italy', currency: 'EUR', flag: '🇮🇹' },
    { code: 'NL', name: 'Netherlands', currency: 'EUR', flag: '🇳🇱' },
    { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹' },

    // Other Europe
    { code: 'GB', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
    { code: 'CH', name: 'Switzerland', currency: 'CHF', flag: '🇨🇭' },
    { code: 'NO', name: 'Norway', currency: 'NOK', flag: '🇳🇴' },
    { code: 'SE', name: 'Sweden', currency: 'SEK', flag: '🇸🇪' },
    { code: 'DK', name: 'Denmark', currency: 'DKK', flag: '🇩🇰' },
    { code: 'IS', name: 'Iceland', currency: 'ISK', flag: '🇮🇸' },
    { code: 'PL', name: 'Poland', currency: 'PLN', flag: '🇵🇱' },
    { code: 'CZ', name: 'Czech Republic', currency: 'CZK', flag: '🇨🇿' },
    { code: 'HU', name: 'Hungary', currency: 'HUF', flag: '🇭🇺' },
    { code: 'TR', name: 'Türkiye', currency: 'TRY', flag: '🇹🇷' },

    // Oceania
    { code: 'AU', name: 'Australia', currency: 'AUD', flag: '🇦🇺' },
    { code: 'NZ', name: 'New Zealand', currency: 'NZD', flag: '🇳🇿' },

    // Middle East
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED', flag: '🇦🇪' },
    { code: 'IL', name: 'Israel', currency: 'ILS', flag: '🇮🇱' },
    { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', flag: '🇸🇦' },

    // South America
    { code: 'BR', name: 'Brazil', currency: 'BRL', flag: '🇧🇷' },
    { code: 'AR', name: 'Argentina', currency: 'ARS', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', currency: 'CLP', flag: '🇨🇱' },
    { code: 'PE', name: 'Peru', currency: 'PEN', flag: '🇵🇪' },
    { code: 'CO', name: 'Colombia', currency: 'COP', flag: '🇨🇴' },

    // Africa
    { code: 'ZA', name: 'South Africa', currency: 'ZAR', flag: '🇿🇦' },
    { code: 'EG', name: 'Egypt', currency: 'EGP', flag: '🇪🇬' },
    { code: 'MA', name: 'Morocco', currency: 'MAD', flag: '🇲🇦' },
]

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export function getCountry(code: string): Country | undefined {
    return COUNTRY_BY_CODE.get(code)
}

/** Derive the set of trip currencies from a list of country codes.
 *  USD is always included. */
export function deriveCurrenciesFromCountries(countryCodes: string[]): string[] {
    const set = new Set<string>(['USD'])
    for (const code of countryCodes) {
        const country = COUNTRY_BY_CODE.get(code)
        if (country) set.add(country.currency)
    }
    return Array.from(set)
}
