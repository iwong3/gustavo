/**
 * Venmo hand-off. Stored profile links (venmo.com/u/<user>) open the website,
 * which is a dead end inside the mobile PWA — the venmo:// scheme opens the
 * app directly with recipient, amount and note prefilled. Falls back to the
 * plain profile URL when the app isn't installed (the visibilitychange guard
 * cancels the fallback once the app actually took over).
 */

/** Extract the username from a venmo.com profile URL. */
export function venmoUsername(venmoUrl: string): string | null {
    const match = venmoUrl.match(
        /venmo\.com\/(?:u\/|code\?user_id=)?(@?[A-Za-z0-9-_]+)\s*$/
    )
    if (!match) return null
    const name = match[1].replace(/^@/, '')
    // Path segments that aren't profiles
    if (['account', 'signup', 'legal'].includes(name.toLowerCase())) return null
    return name
}

export function openVenmoPayment(
    venmoUrl: string,
    amountUsd: number,
    note: string
): void {
    const username = venmoUsername(venmoUrl)
    if (!username || !Number.isFinite(amountUsd) || amountUsd <= 0) {
        window.open(venmoUrl, '_blank', 'noopener')
        return
    }

    const deepLink =
        `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(username)}` +
        `&amount=${amountUsd.toFixed(2)}&note=${encodeURIComponent(note)}`

    // If the app opens, the page hides and we cancel the web fallback
    const fallback = setTimeout(() => {
        window.open(venmoUrl, '_blank', 'noopener')
    }, 1500)
    const onHide = () => {
        if (document.hidden) clearTimeout(fallback)
    }
    document.addEventListener('visibilitychange', onHide, { once: true })

    window.location.href = deepLink
}
