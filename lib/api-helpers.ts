import { auth } from '@/auth'
import pool from '@/lib/db'

export async function requireAuthWithUserId(): Promise<{ email: string; userId: number; isAdmin: boolean } | null> {
    const session = await auth()
    if (!session?.user?.email) return null
    const email = session.user.email
    const res = await pool.query('SELECT id, is_admin FROM users WHERE email = $1 LIMIT 1', [email])
    if (res.rows.length === 0) return null
    return { email, userId: res.rows[0].id, isAdmin: res.rows[0].is_admin }
}
