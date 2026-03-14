/** Types for the Health app (exercise + supplements) */

export type MuscleGroup = {
    id: number
    name: string
}

export type MuscleGroupWithParents = MuscleGroup & {
    parents: MuscleGroup[]  // empty = group-level, populated = target
}

export type Workout = {
    id: number
    date: string            // ISO YYYY-MM-DD
    notes: string | null
    muscleGroups: MuscleGroup[]
    createdAt: string       // ISO timestamp
}

export type DaysSince = {
    muscleGroup: string     // group name
    daysSince: number | null // null = never worked out
    lastDate: string | null  // ISO YYYY-MM-DD
}
