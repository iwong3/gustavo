// Display names for people when a UI keys them by id: the first name, or —
// when two people share one — the first name plus a last-name initial
// ("Alex C." / "Alex P."), falling back to a number if even that collides.
//
// Leaf module (no component imports).

type Person = { id: number | string; name: string; firstName: string }

/** id (as a string) → label. */
export function personLabels(people: Person[]): Map<string, string> {
    const counts = new Map<string, number>()
    for (const p of people) counts.set(p.firstName, (counts.get(p.firstName) ?? 0) + 1)

    const labels = new Map<string, string>()
    const used = new Map<string, number>()
    for (const p of people) {
        let label = p.firstName
        if ((counts.get(p.firstName) ?? 0) > 1) {
            const last = p.name.trim().split(/\s+/).slice(1).pop()
            label = last ? `${p.firstName} ${last[0].toUpperCase()}.` : p.firstName
        }
        // Same first name AND last initial: number them
        const n = (used.get(label) ?? 0) + 1
        used.set(label, n)
        labels.set(String(p.id), n > 1 ? `${label} (${n})` : label)
    }
    return labels
}
