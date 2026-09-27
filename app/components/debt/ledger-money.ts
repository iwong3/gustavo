// Money as the debts page shows it: always two decimals, so amounts in a
// column line up ("$110.00", not "$110"). Cents in, text out.
//
// Leaf module (no component imports).

export const ledgerUsd = (cents: number) =>
    (Math.abs(cents) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

/** "+$19.95" / "−$110.00" (a real minus sign). */
export const signedUsd = (cents: number) => `${cents < 0 ? '−' : '+'}${ledgerUsd(cents)}`
