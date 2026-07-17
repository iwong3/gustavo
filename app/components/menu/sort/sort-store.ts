// The expense list's sort: one field, one direction.
//
// Replaces three stores that each held a tri-state order (none / asc / desc).
// That model implied three sorts could stack, while `applySorting` quietly
// resolved the conflict with a cost → date → name cascade. It also disagreed
// with itself: sort-item-name defined 1 = Ascending where date and cost defined
// 1 = Descending, so the shared `1 → ↓` arrow rendered Name backwards.
//
// One field is always active — a list is always in *some* order, so there is no
// "unsorted" state to represent. Date/desc is the default.
//
// Leaf module (no component imports).

import { create } from 'zustand'

export type SortField = 'date' | 'amount' | 'name'
export type SortDir = 'asc' | 'desc'

export type SortFieldSpec = {
    field: SortField
    label: string
    /** Direction applied when this field is picked fresh. */
    defaultDir: SortDir
    /** Plain-English direction, shown as the section summary. */
    hint: Record<SortDir, string>
    /** Date keeps the date-grouped cards; anything else flattens the list,
     *  since grouping by date would discard the order the user asked for. */
    groupsByDate: boolean
}

export const SORT_FIELDS: SortFieldSpec[] = [
    {
        field: 'date',
        label: 'Date',
        defaultDir: 'desc',
        hint: { desc: 'latest first', asc: 'trip order' },
        groupsByDate: true,
    },
    {
        field: 'amount',
        label: 'Amount',
        defaultDir: 'desc',
        hint: { desc: 'highest first', asc: 'lowest first' },
        groupsByDate: false,
    },
    {
        field: 'name',
        label: 'Name',
        defaultDir: 'asc',
        hint: { asc: 'A–Z', desc: 'Z–A' },
        groupsByDate: false,
    },
]

export const DEFAULT_SORT: { field: SortField; dir: SortDir } = {
    field: 'date',
    dir: 'desc',
}

export const sortSpec = (field: SortField): SortFieldSpec =>
    SORT_FIELDS.find((f) => f.field === field) ?? SORT_FIELDS[0]

type SortStore = {
    field: SortField
    dir: SortDir
    /** Tap the active field to flip its direction; tap another to take it over
     *  at that field's default direction. */
    pick: (field: SortField) => void
    isDefault: () => boolean
    reset: () => void
}

export const useSortStore = create<SortStore>()((set, get) => ({
    ...DEFAULT_SORT,

    pick: (field) =>
        set((s) =>
            s.field === field
                ? { dir: s.dir === 'asc' ? 'desc' : 'asc' }
                : { field, dir: sortSpec(field).defaultDir }
        ),

    isDefault: () => {
        const { field, dir } = get()
        return field === DEFAULT_SORT.field && dir === DEFAULT_SORT.dir
    },

    reset: () => set({ ...DEFAULT_SORT }),
}))
