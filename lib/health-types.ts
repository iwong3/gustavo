/** Types for the Health app (exercise + supplements) */

export type MuscleGroup = {
    id: number
    name: string
}

export type MuscleGroupWithParents = MuscleGroup & {
    parents: MuscleGroup[]  // empty = group-level, populated = target
}

export type Exercise = {
    id: number
    name: string
    isBodyweight: boolean
    muscleGroups: MuscleGroup[]
}

export type WorkoutExerciseSet = {
    setNumber: number
    reps: number | null
}

export type WorkoutExercise = {
    id: number
    exercise: Exercise
    weightLbs: number | null
    sortOrder: number
    sets: WorkoutExerciseSet[]
}

export type Workout = {
    id: number
    date: string            // ISO YYYY-MM-DD
    notes: string | null
    muscleGroups: MuscleGroup[]
    exercises: WorkoutExercise[]  // empty if none logged
    createdAt: string       // ISO timestamp
}

export type DaysSince = {
    muscleGroup: string     // group name
    daysSince: number | null // null = never worked out
    lastDate: string | null  // ISO YYYY-MM-DD
}

export type Supplement = {
    id: number
    name: string
    dosage: string | null
    isActive: boolean
}

export type SupplementLog = {
    id: number
    supplementId: number
    supplementName: string
    date: string            // ISO YYYY-MM-DD
    createdAt: string       // ISO timestamp
}
