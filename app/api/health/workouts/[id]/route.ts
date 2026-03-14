import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const workoutId = parseInt(id, 10)
    if (isNaN(workoutId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const { date, muscleGroupIds, notes } = await request.json()

    if (!date || !muscleGroupIds || !Array.isArray(muscleGroupIds) || muscleGroupIds.length === 0) {
        return NextResponse.json(
            { error: 'date and muscleGroupIds (non-empty array) are required' },
            { status: 400 }
        )
    }

    try {
        const workout = await withAuditUser(authUser.userId, async (client) => {
            // Verify ownership
            const existing = await client.query(
                `SELECT id FROM workouts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
                [workoutId, authUser.userId]
            )
            if (existing.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }

            // Update workout
            await client.query(
                `UPDATE workouts SET date = $1, notes = $2 WHERE id = $3`,
                [date, notes || null, workoutId]
            )

            // Replace muscle group associations
            await client.query(
                `DELETE FROM workout_muscle_groups WHERE workout_id = $1`,
                [workoutId]
            )

            const values = muscleGroupIds
                .map((_: number, i: number) => `($1, $${i + 2})`)
                .join(', ')
            await client.query(
                `INSERT INTO workout_muscle_groups (workout_id, muscle_group_id) VALUES ${values}`,
                [workoutId, ...muscleGroupIds]
            )

            // Fetch updated data
            const res = await client.query(
                `SELECT w.id, w.date, w.notes, w.created_at FROM workouts w WHERE w.id = $1`,
                [workoutId]
            )
            const mgRes = await client.query(
                `SELECT mg.id, mg.name FROM muscle_groups mg
                 JOIN workout_muscle_groups wmg ON wmg.muscle_group_id = mg.id
                 WHERE wmg.workout_id = $1
                 ORDER BY mg.name`,
                [workoutId]
            )

            return {
                id: res.rows[0].id,
                date: res.rows[0].date.toISOString().split('T')[0],
                notes: res.rows[0].notes,
                muscleGroups: mgRes.rows.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })),
                createdAt: res.rows[0].created_at.toISOString(),
            }
        })

        return NextResponse.json(workout)
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
        }
        console.error('Error updating workout:', err)
        return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const workoutId = parseInt(id, 10)
    if (isNaN(workoutId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    try {
        await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `UPDATE workouts SET deleted_at = now()
                 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
                 RETURNING id`,
                [workoutId, authUser.userId]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
        }
        console.error('Error deleting workout:', err)
        return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 })
    }
}
