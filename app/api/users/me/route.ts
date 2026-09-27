import { NextResponse } from 'next/server'
import { requireAuthWithUserId } from '@/lib/api-helpers'

/**
 * Is this session still allowed in? 401 when signed out or removed from the
 * allowlist — hooks/use-access-guard signs the client out on that.
 */
export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ id: String(authUser.userId) })
}
