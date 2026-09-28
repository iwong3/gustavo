import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Supplement } from '@/lib/health-types'
import { isValidDailyDoses } from '@/lib/health/supplement-stack'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const showAll = request.nextUrl.searchParams.get('all') === 'true'

    let query = `
        SELECT id, name, dosage, is_active, daily_doses
        FROM supplements
        WHERE user_id = $1 AND deleted_at IS NULL`

    if (!showAll) {
        query += ` AND is_active = true`
    }

    query += ` ORDER BY name`

    const { rows } = await pool.query(query, [authUser.userId])

    const supplements: Supplement[] = rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        dosage: r.dosage,
        isActive: r.is_active,
        dailyDoses: r.daily_doses ?? null,
    }))

    return NextResponse.json(supplements)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, dosage, dailyDoses } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!isValidDailyDoses(dailyDoses)) {
        return NextResponse.json({ error: 'dailyDoses must be null or a whole number from 1 to 12' }, { status: 400 })
    }

    try {
        const supplement = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO supplements (user_id, name, dosage, daily_doses)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, name, dosage, is_active, daily_doses`,
                [authUser.userId, name.trim(), dosage || null, dailyDoses ?? null]
            )
            return res.rows[0]
        })

        return NextResponse.json(
            {
                id: supplement.id,
                name: supplement.name,
                dosage: supplement.dosage,
                isActive: supplement.is_active,
                dailyDoses: supplement.daily_doses ?? null,
            } as Supplement,
            { status: 201 }
        )
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'A supplement with that name already exists' }, { status: 409 })
        }
        console.error('Error creating supplement:', err)
        return NextResponse.json({ error: 'Failed to create supplement' }, { status: 500 })
    }
}
