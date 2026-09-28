'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys, staleTimes } from '@/lib/query-keys'
import { QUOTES_API, fallbackQuote, pickShortQuote, type Quote } from '@/lib/quotes'
import { useToday } from 'hooks/use-today'

/** Quotes fetched per try — the shortest one that fits is used. */
const BATCH = 5
/** Give up on the API after this long and use a built-in quote. */
const TIMEOUT_MS = 4000

/**
 * Today's Breaking Bad quote for the home greeting (hero and header). Fetched
 * once per local day from the free quotes API and kept in the persisted query
 * cache, so it's the same line all day, instant on later opens, and works
 * offline. If the API is down, slow or returns nothing short enough, a
 * built-in quote (stable for the day) is used instead.
 *
 * `ready` is false until the day's quote has resolved — callers keep its
 * space but hide the text, so the line doesn't visibly swap.
 */
export function useHomeQuote(): { quote: Quote; ready: boolean } {
    const today = useToday()
    const { data, isPending } = useQuery({
        queryKey: queryKeys.home.quote(today),
        queryFn: async (): Promise<Quote> => {
            try {
                const res = await fetch(`${QUOTES_API}/${BATCH}`, {
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                })
                if (res.ok) {
                    const picked = pickShortQuote(await res.json())
                    if (picked) return picked
                }
            } catch {
                // Offline, blocked or timed out — fall through
            }
            return fallbackQuote(today)
        },
        staleTime: staleTimes.forever,
        retry: false,
    })
    return { quote: data ?? fallbackQuote(today), ready: !isPending }
}
