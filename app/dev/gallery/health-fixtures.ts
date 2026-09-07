/**
 * Health mock data for the dev component gallery (/dev/gallery).
 * Pure fixtures — never imported by production code.
 */
import type {
    Exercise,
    MuscleGroupWithParents,
    Workout,
    WorkoutPreset,
} from '@/lib/health-types'
import { MUSCLE_GROUPS, TARGET_PARENTS } from '@/lib/health/muscle-groups'

import { GALLERY_TODAY } from './fixtures'

/** Every group + target with ids, mirroring /api/health/muscle-groups. */
export const muscleGroups: MuscleGroupWithParents[] = (() => {
    const groups: MuscleGroupWithParents[] = MUSCLE_GROUPS.map((name, i) => ({
        id: i + 1,
        name,
        parents: [],
    }))
    const byName = new Map(groups.map((g) => [g.name, g]))
    const targets: MuscleGroupWithParents[] = Object.entries(
        TARGET_PARENTS
    ).map(([name, parents], i) => ({
        id: 100 + i,
        name,
        parents: parents.map((p) => {
            const g = byName.get(p)!
            return { id: g.id, name: g.name }
        }),
    }))
    return [...groups, ...targets]
})()

const mg = (name: string) => {
    const g = muscleGroups.find((m) => m.name === name)
    if (!g) throw new Error(`fixture: unknown muscle group ${name}`)
    return { id: g.id, name: g.name }
}

export const exercises: Exercise[] = [
    {
        id: 1,
        name: 'Bench Press',
        isBodyweight: false,
        muscleGroups: [mg('Chest'), mg('Triceps')],
    },
    {
        id: 2,
        name: 'Incline Dumbbell Press',
        isBodyweight: false,
        muscleGroups: [mg('Upper Chest'), mg('Front Delts')],
    },
    {
        id: 3,
        name: 'Overhead Press',
        isBodyweight: false,
        muscleGroups: [mg('Shoulders'), mg('Triceps')],
    },
    {
        id: 4,
        name: 'Pull-ups',
        isBodyweight: true,
        muscleGroups: [mg('Lats'), mg('Biceps')],
    },
    {
        id: 5,
        name: 'Barbell Row',
        isBodyweight: false,
        muscleGroups: [mg('Upper Back'), mg('Rhomboids')],
    },
    {
        id: 6,
        name: 'Squat',
        isBodyweight: false,
        muscleGroups: [mg('Quads'), mg('Glutes')],
    },
    {
        id: 7,
        name: 'Romanian Deadlift',
        isBodyweight: false,
        muscleGroups: [mg('Hamstrings'), mg('Lower Back')],
    },
    { id: 8, name: 'Plank', isBodyweight: true, muscleGroups: [mg('Core')] },
    {
        id: 9,
        name: 'Jogging',
        isBodyweight: true,
        muscleGroups: [mg('Jogging')],
    },
]

const ex = (id: number) => exercises.find((e) => e.id === id)!

export const presets: WorkoutPreset[] = [
    {
        id: 1,
        name: 'Push Day',
        muscleGroups: [mg('Chest'), mg('Shoulders'), mg('Triceps')],
        exercises: [ex(1), ex(2), ex(3)],
    },
    {
        id: 2,
        name: 'Pull Day',
        muscleGroups: [mg('Upper Back'), mg('Biceps')],
        exercises: [ex(4), ex(5)],
    },
    {
        id: 3,
        name: 'Legs',
        muscleGroups: [mg('Legs'), mg('Lower Back')],
        exercises: [ex(6), ex(7)],
    },
]

/** A logged push session with uniform and per-set reps — exercises the edit
 *  form's collapsed and expanded set rows. */
export const workout: Workout = {
    id: 42,
    date: GALLERY_TODAY,
    notes: 'Felt strong. Bench moved up 5 lbs.',
    muscleGroups: [
        mg('Chest'),
        mg('Upper Chest'),
        mg('Shoulders'),
        mg('Triceps'),
    ],
    exercises: [
        {
            id: 1,
            exercise: ex(1),
            weightLbs: 185,
            sortOrder: 0,
            sets: [
                { setNumber: 1, reps: 8 },
                { setNumber: 2, reps: 8 },
                { setNumber: 3, reps: 8 },
            ],
        },
        {
            id: 2,
            exercise: ex(2),
            weightLbs: 60,
            sortOrder: 1,
            sets: [
                { setNumber: 1, reps: 12 },
                { setNumber: 2, reps: 10 },
                { setNumber: 3, reps: 8 },
            ],
        },
        {
            id: 3,
            exercise: ex(3),
            weightLbs: 95,
            sortOrder: 2,
            sets: [],
        },
    ],
    createdAt: `${GALLERY_TODAY}T18:00:00Z`,
}
