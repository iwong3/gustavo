/**
 * For everything related to currency
 */

export type CurrencyMeta = {
    decimals: number
    symbol: string
    step: string // input step for number fields
}

/** Per-currency display metadata. Currencies not listed here fall back to the
 *  code as symbol and 2-decimal formatting (see `getCurrencyMeta`). Add entries
 *  here when a new country is added to lib/countries.ts and you want a nicer
 *  symbol/step. */
export const CURRENCY_META: Record<string, CurrencyMeta> = {
    USD: { decimals: 2, symbol: '$', step: '0.01' },
    CAD: { decimals: 2, symbol: 'CA$', step: '0.01' },
    JPY: { decimals: 0, symbol: '¥', step: '1' },
    KRW: { decimals: 0, symbol: '₩', step: '1' },
    EUR: { decimals: 2, symbol: '€', step: '0.01' },
    GBP: { decimals: 2, symbol: '£', step: '0.01' },
    CHF: { decimals: 2, symbol: 'CHF', step: '0.01' },
    AUD: { decimals: 2, symbol: 'A$', step: '0.01' },
    NZD: { decimals: 2, symbol: 'NZ$', step: '0.01' },
    HKD: { decimals: 2, symbol: 'HK$', step: '0.01' },
    SGD: { decimals: 2, symbol: 'S$', step: '0.01' },
    TWD: { decimals: 0, symbol: 'NT$', step: '1' },
    CNY: { decimals: 2, symbol: '¥', step: '0.01' },
    THB: { decimals: 2, symbol: '฿', step: '0.01' },
    VND: { decimals: 0, symbol: '₫', step: '1' },
    MYR: { decimals: 2, symbol: 'RM', step: '0.01' },
    IDR: { decimals: 0, symbol: 'Rp', step: '1' },
    PHP: { decimals: 2, symbol: '₱', step: '0.01' },
    INR: { decimals: 2, symbol: '₹', step: '0.01' },
    MXN: { decimals: 2, symbol: 'MX$', step: '0.01' },
    BRL: { decimals: 2, symbol: 'R$', step: '0.01' },
    ARS: { decimals: 2, symbol: 'AR$', step: '0.01' },
    CLP: { decimals: 0, symbol: 'CLP$', step: '1' },
    PEN: { decimals: 2, symbol: 'S/', step: '0.01' },
    COP: { decimals: 0, symbol: 'CO$', step: '1' },
    ZAR: { decimals: 2, symbol: 'R', step: '0.01' },
    EGP: { decimals: 2, symbol: 'E£', step: '0.01' },
    MAD: { decimals: 2, symbol: 'MAD', step: '0.01' },
    AED: { decimals: 2, symbol: 'AED', step: '0.01' },
    ILS: { decimals: 2, symbol: '₪', step: '0.01' },
    SAR: { decimals: 2, symbol: 'SAR', step: '0.01' },
    NOK: { decimals: 2, symbol: 'kr', step: '0.01' },
    SEK: { decimals: 2, symbol: 'kr', step: '0.01' },
    DKK: { decimals: 2, symbol: 'kr', step: '0.01' },
    ISK: { decimals: 0, symbol: 'kr', step: '1' },
    PLN: { decimals: 2, symbol: 'zł', step: '0.01' },
    CZK: { decimals: 2, symbol: 'Kč', step: '0.01' },
    HUF: { decimals: 0, symbol: 'Ft', step: '1' },
    TRY: { decimals: 2, symbol: '₺', step: '0.01' },
}

export function getCurrencyMeta(code: string): CurrencyMeta {
    return CURRENCY_META[code] ?? { decimals: 2, symbol: code, step: '0.01' }
}

/** Format a currency code for display in dropdowns, e.g. "JPY (¥)" */
export function formatCurrencyLabel(code: string): string {
    return `${code} (${getCurrencyMeta(code).symbol})`
}

export enum CostDisplay {
    Original,
    Converted,
}

export const FormattedMoney = (
    currency: string = 'USD',
    digits?: number
) => {
    const meta = getCurrencyMeta(currency)
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: digits ?? meta.decimals,
    })
}
