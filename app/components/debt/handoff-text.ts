// Plain-English lines for plan hand-offs (lib/debt-proof.ts planHandoffs):
// why a payment goes to someone other than who you owe, as a swap —
// "$24.96: instead of you paying Jenny and Priya paying Marco, you pay
// Marco and Priya pays Jenny."
//
// Leaf module (no component imports).

import type { Handoff, Move } from '@/lib/debt-proof'
import { formatUsd } from 'utils/currency'

export type HandoffLine = { amount: string; text: string }

const list = (items: string[]) =>
    items.length <= 1
        ? (items[0] ?? '')
        : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

export function handoffLine(
    h: Handoff,
    names: {
        /** The logged-in user — always "you". */
        currentUserId: number
        nameOf: (id: number) => string
    }
): HandoffLine {
    const isYou = (id: number) => String(id) === String(names.currentUserId)
    const who = (id: number) => (isYou(id) ? 'you' : names.nameOf(id))
    const paying = (m: Move) => `${who(m.from)} paying ${who(m.to)}`
    const pays = (m: Move) => `${who(m.from)} ${isYou(m.from) ? 'pay' : 'pays'} ${who(m.to)}`
    const instead = h.added.length > 0 ? list(h.added.map(pays)) : 'nobody pays: it’s a loop, so it cancels out'
    return {
        amount: formatUsd(h.cents / 100, 2),
        text: `instead of ${list(h.dropped.map(paying))}, ${instead}.`,
    }
}
