/**
 * For everything related to currency
 */

export enum Currency {
    CAD = 'CAD',
    JPY = 'JPY',
    KRW = 'KRW',
    USD = 'USD',
}

export type CurrencyMeta = {
    decimals: number
    symbol: string
    step: string // input step for number fields
}

export const CURRENCY_META: Record<Currency, CurrencyMeta> = {
    [Currency.USD]: { decimals: 2, symbol: '$', step: '0.01' },
    [Currency.CAD]: { decimals: 2, symbol: 'CA$', step: '0.01' },
    [Currency.JPY]: { decimals: 0, symbol: '¥', step: '1' },
    [Currency.KRW]: { decimals: 0, symbol: '₩', step: '1' },
}

export function getCurrencyMeta(code: string): CurrencyMeta {
    return CURRENCY_META[code as Currency] ?? { decimals: 2, symbol: code, step: '0.01' }
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
