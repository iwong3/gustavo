// Breaking Bad quotes for the home greeting. The home page fetches a random
// one per day from the free Breaking Bad Quotes API (no key, CORS-open) and
// falls back to this list when it's unreachable or you're offline.
//
// Leaf module (no component imports).

export type Quote = { quote: string; author: string }

/** The API: GET …/quotes/N returns N random quotes as [{ quote, author }]. */
export const QUOTES_API = 'https://api.breakingbadquotes.xyz/v1/quotes'

/** Longer than this won't fit the header in two lines on a 375px phone (measured) — skipped. */
export const MAX_QUOTE_LENGTH = 70

/** Short, well-known lines used when the API can't be reached. */
export const FALLBACK_QUOTES: Quote[] = [
    { quote: 'I am the one who knocks.', author: 'Walter White' },
    { quote: 'Say my name.', author: 'Walter White' },
    { quote: 'I am the danger.', author: 'Walter White' },
    { quote: 'Tread lightly.', author: 'Walter White' },
    { quote: "We're done when I say we're done.", author: 'Walter White' },
    { quote: 'Stay out of my territory.', author: 'Walter White' },
    { quote: 'I hide in plain sight, same as you.', author: 'Gus Fring' },
    { quote: 'No more half measures.', author: 'Mike Ehrmantraut' },
    { quote: 'Yeah, science!', author: 'Jesse Pinkman' },
    { quote: 'Better call Saul!', author: 'Saul Goodman' },
]

/** A fallback quote that stays the same all day (`day` = local YYYY-MM-DD). */
export function fallbackQuote(day: string): Quote {
    let hash = 0
    for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    return FALLBACK_QUOTES[hash % FALLBACK_QUOTES.length]
}

/** The shortest usable quote from an API batch, or null if none fit. */
export function pickShortQuote(batch: unknown): Quote | null {
    if (!Array.isArray(batch)) return null
    const usable = batch.filter(
        (q): q is Quote =>
            !!q &&
            typeof q.quote === 'string' &&
            typeof q.author === 'string' &&
            q.quote.trim().length > 0 &&
            q.quote.length <= MAX_QUOTE_LENGTH
    )
    if (usable.length === 0) return null
    return usable.reduce((a, b) => (b.quote.length < a.quote.length ? b : a))
}
