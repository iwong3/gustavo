import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Supplement } from '@/lib/health-types'
import { isValidDailyDoses } from '@/lib/health/supplement-stack'
import { isOptionalIsoDate } from '@/lib/health/supplement-runs'

type Params = { id: string }

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    // eventDate: the device's log day, for any stack change this edit makes.
    // startedOn: re-anchor the current run ("Started" on the form).
    const { name, dosage, isActive, eventDate, startedOn } = body
    // dailyDoses: absent = unchanged, null = leave the daily stack
    const setDailyDoses = Object.prototype.hasOwnProperty.call(body, 'dailyDoses')
    if (setDailyDoses && !isValidDailyDoses(body.dailyDoses)) {
        return NextResponse.json({ error: 'dailyDoses must be null or a whole number from 1 to 12' }, { status: 400 })
    }
    if (!isOptionalIsoDate(eventDate) || !isOptionalIsoDate(startedOn)) {
        return NextResponse.json({ error: 'eventDate and startedOn must be YYYY-MM-DD' }, { status: 400 })
    }

    // Verify ownership
    const check = await pool.query(
        'SELECT id FROM supplements WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    try {
        const updated = await withAuditUser(authUser.userId, async (client) => {
            const before = (
                await client.query(
                    'SELECT is_active, daily_doses FROM supplements WHERE id = $1 FOR UPDATE',
                    [id]
                )
            ).rows[0]
            const res = await client.query(
                `UPDATE supplements
                 SET name = COALESCE($1, name),
                     dosage = COALESCE($2, dosage),
                     is_active = COALESCE($3, is_active),
                     daily_doses = CASE WHEN $5::boolean THEN $6::int ELSE daily_doses END
                 WHERE id = $4
                 RETURNING id, name, dosage, is_active, daily_doses`,
                [name?.trim() || null, dosage, isActive, id, setDailyDoses, setDailyDoses ? body.dailyDoses : null]
            )
            const after = res.rows[0]

            // Record the stack change, if any (feeds runs + calendar badges)
            const kind =
                before.is_active && !after.is_active
                    ? 'stopped'
                    : !before.is_active && after.is_active
                      ? 'started'
                      : after.is_active && before.daily_doses !== after.daily_doses
                        ? 'dose_changed'
                        : null
            if (kind) {
                await client.query(
                    `INSERT INTO supplement_events (user_id, supplement_id, date, kind, daily_doses)
                     VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5)`,
                    [authUser.userId, id, eventDate ?? null, kind, kind === 'stopped' ? null : after.daily_doses]
                )
            }

            // Re-anchor the current run: move its latest `started` event.
            // The edit bumps updated_at, so the stretch since is vouched for.
            if (startedOn && after.is_active) {
                const moved = await client.query(
                    `UPDATE supplement_events SET date = $1
                     WHERE id = (SELECT id FROM supplement_events
                                 WHERE supplement_id = $2 AND kind = 'started' AND deleted_at IS NULL
                                 ORDER BY date DESC, id DESC LIMIT 1)`,
                    [startedOn, id]
                )
                if (moved.rowCount === 0) {
                    await client.query(
                        `INSERT INTO supplement_events (user_id, supplement_id, date, kind, daily_doses)
                         VALUES ($1, $2, $3, 'started', $4)`,
                        [authUser.userId, id, startedOn, after.daily_doses]
                    )
                }
            }
            return after
        })

        return NextResponse.json({
            id: updated.id,
            name: updated.name,
            dosage: updated.dosage,
            isActive: updated.is_active,
            dailyDoses: updated.daily_doses ?? null,
        } as Supplement)
    } catch (err) {
        console.error('Error updating supplement:', err)
        return NextResponse.json({ error: 'Failed to update supplement' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Verify ownership
    const check = await pool.query(
        'SELECT id FROM supplements WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            'UPDATE supplements SET deleted_at = now() WHERE id = $1',
            [id]
        )
    })

    return NextResponse.json({ success: true })
}
