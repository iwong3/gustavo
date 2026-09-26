// What the debts page is showing — whose balance, which plan (while the
// trip isn't locked to one), and which waterfall row is open — kept per
// trip so drilling into an expense and coming back lands where you left.
//
// Leaf module (no component imports).

import { create } from 'zustand'

import type { SettlePlan } from '@/lib/types'

/** A waterfall row: a counterparty's id, or 'all' for every expense. */
export type DebtsSelection = string | null

type TripView = { personId: string | null; plan: SettlePlan; selected: DebtsSelection }

const DEFAULT_VIEW: TripView = { personId: null, plan: 'fewest', selected: null }

type DebtsViewStore = {
    byTrip: Record<string, TripView>
    update: (tripId: number, patch: Partial<TripView>) => void
}

export const useDebtsViewStore = create<DebtsViewStore>((set) => ({
    byTrip: {},
    update: (tripId, patch) =>
        set((s) => {
            const key = String(tripId)
            return { byTrip: { ...s.byTrip, [key]: { ...(s.byTrip[key] ?? DEFAULT_VIEW), ...patch } } }
        }),
}))

/** This trip's view state + setters. */
export function useDebtsView(tripId: number) {
    const view = useDebtsViewStore((s) => s.byTrip[String(tripId)]) ?? DEFAULT_VIEW
    const update = useDebtsViewStore((s) => s.update)
    return {
        ...view,
        setPersonId: (personId: number) => update(tripId, { personId: String(personId), selected: null }),
        setPlan: (plan: SettlePlan) => update(tripId, { plan }),
        setSelected: (selected: DebtsSelection) => update(tripId, { selected }),
    }
}
