/**
 * For everything related to currency
 */

export enum Currency {
    CAD = 'CAD',
    JPY = 'JPY',
    USD = 'USD',
}

export enum CostDisplay {
    Original,
    Converted,
}

export const FormattedMoney = (
    currency: string = 'USD',
    digits: number = 2
) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: digits,
    })
}
