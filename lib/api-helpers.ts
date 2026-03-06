import { auth } from '@/auth'
import pool from '@/lib/db'

/**
 * Checks the session and resolves the current user's DB ID.
 * Returns { email, userId } if authenticated, or null if not.
 * userId can be null if the email is not in the users table (shouldn't happen in practice).
 *
 * Usage in write routes:
 *   const authUser = await requireAuthWithUserId()
 *   if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   const { userId } = authUser
 */
export async function requireAuthWithUserId(): Promise<{ email: string; userId: number | null } | null> {
    const session = await auth()
    if (!session?.user?.email) return null
    const email = session.user.email
    const res = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    const userId: number | null = res.rows[0]?.id ?? null
    return { email, userId }
}
