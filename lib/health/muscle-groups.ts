/**
 * Muscle group constants — mirrors the DB seed data for instant UI rendering.
 * The DB (muscle_groups + muscle_group_parents) is the source of truth.
 * This file is a code-side cache so the UI can render without a loading state.
 *
 * Group vs target: groups have no parents, targets have one or more parents.
 * "Days since" can be calculated for any muscle group (group or target).
 * Parent rollup: logging a target also counts as logging its parent group(s).
 */

/** Top-level muscle groups (no parents in muscle_group_parents) */
export const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Forearms', 'Legs', 'Core', 'Cardio',
] as const

export type MuscleGroupName = typeof MUSCLE_GROUPS[number]

/** Target → parent group(s). A target can belong to multiple groups. */
export const TARGET_PARENTS: Record<string, string[]> = {
    'Upper Chest':  ['Chest'],
    'Lower Chest':  ['Chest'],
    'Lats':         ['Back'],
    'Rhomboids':    ['Back'],
    'Lower Back':   ['Back'],
    'Traps':        ['Back'],
    'Front Delts':  ['Shoulders'],
    'Side Delts':   ['Shoulders'],
    'Rear Delts':   ['Shoulders', 'Back'],
    'Quads':        ['Legs'],
    'Hamstrings':   ['Legs'],
    'Glutes':       ['Legs'],
    'Calves':       ['Legs'],
    'Adductors':    ['Legs'],
    'Abductors':    ['Legs'],
    'Hip Flexors':  ['Legs'],
    'Upper Abs':    ['Core'],
    'Lower Abs':    ['Core'],
    'Obliques':     ['Core'],
    'Jogging':      ['Cardio'],
}

/** All target names */
export const TARGETS = Object.keys(TARGET_PARENTS)

/** Group → its targets (derived from TARGET_PARENTS) */
export const GROUP_TARGETS: Record<string, string[]> = (() => {
    const map: Record<string, string[]> = {}
    for (const group of MUSCLE_GROUPS) {
        map[group] = []
    }
    for (const [target, parents] of Object.entries(TARGET_PARENTS)) {
        for (const parent of parents) {
            map[parent]?.push(target)
        }
    }
    return map
})()

/**
 * Display order for the workout form — grouped by push/pull/legs.
 * This is presentation-only, not stored in DB.
 */
export const DISPLAY_ORDER = [
    // Push
    'Chest', 'Shoulders', 'Triceps',
    // Pull
    'Back', 'Biceps', 'Forearms',
    // Legs
    'Legs',
    // Other
    'Core', 'Cardio',
] as const

/** Check if a muscle group name is a group (top-level) */
export function isGroup(name: string): boolean {
    return (MUSCLE_GROUPS as readonly string[]).includes(name)
}

/** Check if a muscle group name is a target (has parents) */
export function isTarget(name: string): boolean {
    return name in TARGET_PARENTS
}

/** Get parent groups for a muscle name. Returns empty array for groups. */
export function getParents(name: string): string[] {
    return TARGET_PARENTS[name] ?? []
}
