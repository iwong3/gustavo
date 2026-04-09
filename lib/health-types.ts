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
    quantity: number
    createdAt: string       // ISO timestamp
}

export type WorkoutPreset = {
    id: number
    name: string
    muscleGroups: MuscleGroup[]
    exercises: Exercise[]
}

export type SupplementPreset = {
    id: number
    name: string
    supplements: Supplement[]
}

// --- Diet ---

export type FoodGroupTag = {
    id: number
    name: string
    color: string
}

export type Food = {
    id: number
    name: string
    isActive: boolean
    groups: FoodGroupTag[]
}

export type FoodGroup = {
    id: number
    name: string
    color: string
    isActive: boolean
    foodIds: number[]
}

export type MealGroup = {
    id: number
    label: string
    quantity: number
    foods: FoodLogEntry[]
}

export type FoodLogEntry = {
    id: number // food_logs.id
    food: Food
    quantity: number
    mealGroupId: number | null
}

export type DietDay = {
    date: string
    standaloneFoods: FoodLogEntry[] // meal_group_id IS NULL
    mealGroups: MealGroup[] // grouped by meal_group
}

export type DietPreset = {
    id: number
    name: string
    items: DietPresetItem[]
}

export type DietPresetItem = {
    foodId: number
    foodName: string
    quantity: number
}

// --- Symptoms ---

export type Symptom = {
    id: number
    name: string
    isActive: boolean
}

export type SymptomLog = {
    id: number
    symptomId: number
    symptomName: string
    date: string
    notes: string | null
    createdAt: string
}

// --- Weight ---

export type WeightLog = {
    id: number
    date: string            // ISO YYYY-MM-DD
    weightLbs: number       // e.g. 185.5
    createdAt: string       // ISO timestamp
}

// --- Forensic View ---

export type DaySnapshot = {
    date: string
    foods: FoodLogEntry[]
    mealGroups: MealGroup[]
    supplements: { name: string; quantity: number }[]
    workout: { muscleGroups: string[]; notes: string | null } | null
}

export type SymptomForensicView = {
    symptomName: string
    currentDate: string
    lookback: DaySnapshot[] // current day + 3 prior days
    pastOccurrences: {
        date: string
        notes: string | null
        lookback: DaySnapshot[] // that day + 3 prior days
    }[]
    commonFoods: {
        // foods appearing in 2+ occurrence windows
        foodName: string
        occurrenceCount: number // how many symptom windows included this food
        totalOccurrences: number // total symptom occurrences (denominator)
    }[]
}
