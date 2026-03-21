import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { DaySnapshot, SymptomForensicView, FoodLogEntry, MealGroup } from '@/lib/health-types'

type Params = { id: string }

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Get the symptom log
    const logRes = await pool.query(
        `SELECT sl.id, sl.symptom_id, s.name AS symptom_name, sl.date, sl.notes
         FROM symptom_logs sl
         JOIN symptoms s ON s.id = sl.symptom_id
         WHERE sl.id = $1 AND sl.user_id = $2`,
        [id, authUser.userId]
    )
    if (logRes.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const log = logRes.rows[0]
    const currentDate = log.date.toISOString().split('T')[0]
    const symptomId = log.symptom_id

    // Get lookback for current occurrence (current day + 3 prior)
    const lookback = await getDaySnapshots(authUser.userId, currentDate, 3)

    // Get all other occurrences of the same symptom
    const occRes = await pool.query(
        `SELECT id, date, notes FROM symptom_logs
         WHERE user_id = $1 AND symptom_id = $2 AND id != $3
         ORDER BY date DESC`,
        [authUser.userId, symptomId, id]
    )

    const pastOccurrences = await Promise.all(
        occRes.rows.map(async (occ) => {
            const occDate = occ.date.toISOString().split('T')[0]
            const occLookback = await getDaySnapshots(authUser.userId, occDate, 3)
            return {
                date: occDate,
                notes: occ.notes,
                lookback: occLookback,
            }
        })
    )

    // Compute common foods across all occurrence windows (including current)
    const allWindows = [lookback, ...pastOccurrences.map((o) => o.lookback)]
    const commonFoods = computeCommonFoods(allWindows)

    const forensic: SymptomForensicView = {
        symptomName: log.symptom_name,
        currentDate,
        lookback,
        pastOccurrences,
        commonFoods,
    }

    return NextResponse.json(forensic)
}

/** Get day snapshots for a date range: [date - daysBefore, date] */
async function getDaySnapshots(userId: number, endDate: string, daysBefore: number): Promise<DaySnapshot[]> {
    // Compute start date
    const end = new Date(endDate + 'T00:00:00Z')
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - daysBefore)
    const startDate = start.toISOString().split('T')[0]

    // Fetch food logs for the window
    const foodRes = await pool.query(
        `SELECT fl.id, fl.food_id, f.name AS food_name, f.is_active,
                fl.date, fl.quantity, fl.meal_group_id,
                mg.label AS meal_label
         FROM food_logs fl
         JOIN foods f ON f.id = fl.food_id
         LEFT JOIN meal_groups mg ON mg.id = fl.meal_group_id
         WHERE fl.user_id = $1 AND fl.date >= $2 AND fl.date <= $3
         ORDER BY fl.date, mg.label NULLS LAST, f.name`,
        [userId, startDate, endDate]
    )

    // Fetch supplement logs
    const supRes = await pool.query(
        `SELECT sl.date, s.name, sl.quantity
         FROM supplement_logs sl
         JOIN supplements s ON s.id = sl.supplement_id
         WHERE sl.user_id = $1 AND sl.date >= $2 AND sl.date <= $3
         ORDER BY sl.date, s.name`,
        [userId, startDate, endDate]
    )

    // Fetch workouts
    const workoutRes = await pool.query(
        `SELECT w.date, w.notes,
                COALESCE(
                    json_agg(DISTINCT mg.name) FILTER (WHERE mg.id IS NOT NULL),
                    '[]'
                ) AS muscle_groups
         FROM workouts w
         LEFT JOIN workout_muscle_groups wmg ON wmg.workout_id = w.id
         LEFT JOIN muscle_groups mg ON mg.id = wmg.muscle_group_id
         WHERE w.user_id = $1 AND w.date >= $2 AND w.date <= $3 AND w.deleted_at IS NULL
         GROUP BY w.id, w.date, w.notes
         ORDER BY w.date`,
        [userId, startDate, endDate]
    )

    // Build snapshots for each day in the window
    const snapshots: DaySnapshot[] = []
    for (let d = new Date(end); d >= start; d.setUTCDate(d.getUTCDate() - 1)) {
        const dateStr = d.toISOString().split('T')[0]

        // Foods for this day
        const dayFoods = foodRes.rows.filter((r) => r.date.toISOString().split('T')[0] === dateStr)
        const standalone: FoodLogEntry[] = []
        const mealMap = new Map<number, MealGroup>()

        for (const r of dayFoods) {
            const entry: FoodLogEntry = {
                id: Number(r.id),
                food: { id: Number(r.food_id), name: r.food_name, isActive: r.is_active },
                quantity: r.quantity,
                mealGroupId: r.meal_group_id ? Number(r.meal_group_id) : null,
            }
            if (r.meal_group_id) {
                const mgId = Number(r.meal_group_id)
                if (!mealMap.has(mgId)) {
                    mealMap.set(mgId, { id: mgId, label: r.meal_label, foods: [] })
                }
                mealMap.get(mgId)!.foods.push(entry)
            } else {
                standalone.push(entry)
            }
        }

        // Supplements for this day
        const daySups = supRes.rows
            .filter((r) => r.date.toISOString().split('T')[0] === dateStr)
            .map((r) => ({ name: r.name, quantity: r.quantity }))

        // Workout for this day (combine if multiple)
        const dayWorkouts = workoutRes.rows.filter(
            (r) => r.date.toISOString().split('T')[0] === dateStr
        )
        let workout: DaySnapshot['workout'] = null
        if (dayWorkouts.length > 0) {
            const allMuscleGroups = dayWorkouts.flatMap((w) => w.muscle_groups)
            const uniqueGroups = Array.from(new Set(allMuscleGroups))
            const notes = dayWorkouts.map((w) => w.notes).filter(Boolean).join('; ') || null
            workout = { muscleGroups: uniqueGroups, notes }
        }

        snapshots.push({
            date: dateStr,
            foods: standalone,
            mealGroups: Array.from(mealMap.values()),
            supplements: daySups,
            workout,
        })
    }

    return snapshots
}

/** Find foods appearing in 2+ symptom occurrence windows */
function computeCommonFoods(
    allWindows: DaySnapshot[][]
): SymptomForensicView['commonFoods'] {
    if (allWindows.length < 2) return []

    // For each window, collect unique food names
    const windowFoodSets = allWindows.map((window) => {
        const foods = new Set<string>()
        for (const day of window) {
            for (const entry of day.foods) {
                foods.add(entry.food.name)
            }
            for (const mg of day.mealGroups) {
                for (const entry of mg.foods) {
                    foods.add(entry.food.name)
                }
            }
        }
        return foods
    })

    // Count how many windows each food appears in
    const foodCounts = new Map<string, number>()
    for (const foodSet of windowFoodSets) {
        foodSet.forEach((food) => {
            foodCounts.set(food, (foodCounts.get(food) || 0) + 1)
        })
    }

    // Filter to foods appearing in 2+ windows, sort by frequency desc
    const totalOccurrences = allWindows.length
    return Array.from(foodCounts.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([foodName, occurrenceCount]) => ({
            foodName,
            occurrenceCount,
            totalOccurrences,
        }))
}
