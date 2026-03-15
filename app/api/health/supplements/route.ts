import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Supplement } from '@/lib/health-types'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const showAll = request.nextUrl.searchParams.get('all') === 'true'

    let query = `
        SELECT id, name, dosage, is_active
        FROM supplements
        WHERE user_id = $1 AND deleted_at IS NULL`

    if (!showAll) {
        query += ` AND is_active = true`
    }

    query += ` ORDER BY name`

    const { rows } = await pool.query(query, [authUser.userId])

    const supplements: Supplement[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        dosage: r.dosage,
        isActive: r.is_active,
    }))

    return NextResponse.json(supplements)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, dosage } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    try {
        const supplement = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO supplements (user_id, name, dosage)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, dosage, is_active`,
                [authUser.userId, name.trim(), dosage || null]
            )
            return res.rows[0]
        })

        return NextResponse.json(
            {
                id: supplement.id,
                name: supplement.name,
                dosage: supplement.dosage,
                isActive: supplement.is_active,
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
