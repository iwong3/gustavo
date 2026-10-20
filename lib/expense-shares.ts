// Who is responsible for how much of one expense — the single per-expense
// rule behind the debt map (lib/spend.ts computeDebtMap), per-person spend,
// the debt proof (lib/debt-proof.ts) and the pair-detail page (lib/debt.ts).
// Leaf file: imports nothing, so every one of those can use it without a cycle.

/** The expense fields the share rule reads. `Expense` satisfies it. */
export type ShareExpense = {
    paidBy: { id: number }
    isEveryone: boolean
    splitBetween: { id: number }[]
    /** Treated ("treat"): their share is paid by the coverers. */
    coveredParticipants: { id: number }[]
    /** Who chips in for the treated shares (00047). Empty or missing ⇒ the
     *  payer covers — pre-00047 expenses and caches lack it. */
    coveringParticipants?: { id: number }[]
}

export type PersonShare = { id: number; share: number }

/**
 * Each person's share of one expense (USD): the expense splits evenly across
 * its participants; treated participants' shares are split evenly across the
 * coverers (the payer when nobody is marked). Treated people get no entry.
 *
 * Ids are opaque (BIGINT strings at runtime) — compared via String(), and
 * returned as the expense's own id values so callers' map keys stay stable.
 */
export function expenseShares(exp: ShareExpense, usdValue: number, participantCount: number): PersonShare[] {
    const splitCount = exp.isEveryone ? participantCount : exp.splitBetween.length
    if (splitCount === 0) return []
    const splitCost = usdValue / splitCount

    const inSplit = new Set(exp.splitBetween.map((p) => String(p.id)))
    const covered = new Set(
        exp.coveredParticipants.map((p) => String(p.id)).filter((id) => inSplit.has(id))
    )

    const shares = new Map<string, PersonShare>()
    const add = (id: number, amount: number) => {
        const row = shares.get(String(id)) ?? { id, share: 0 }
        row.share += amount
        shares.set(String(id), row)
    }

    let treatedTotal = 0
    for (const p of exp.splitBetween) {
        if (covered.has(String(p.id))) treatedTotal += splitCost
        else add(p.id, splitCost)
    }

    if (treatedTotal > 0) {
        const marked = (exp.coveringParticipants ?? []).filter(
            (p) => inSplit.has(String(p.id)) && !covered.has(String(p.id))
        )
        const coverers = marked.length > 0 ? marked : [exp.paidBy]
        for (const c of coverers) add(c.id, treatedTotal / coverers.length)
    }

    return Array.from(shares.values())
}
