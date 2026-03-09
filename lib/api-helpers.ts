import { auth } from '@/auth'
import pool from '@/lib/db'

// Palette for auto-provisioned user icons
const ICON_COLORS = [
    '#ffc857', '#c8553d', '#64b5f6', '#fca311', '#c8b6ff',
    '#90a955', '#e5989b', '#b8c0ff', '#ffc09f', '#a8dadc',
]

function deriveInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

function pickIconColor(): string {
    return ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)]
}

export async function requireAuthWithUserId(): Promise<{ email: string; userId: number; isAdmin: boolean } | null> {
    const session = await auth()
    if (!session?.user?.email) return null
    const email = session.user.email

    // Look up existing user
    const res = await pool.query('SELECT id, is_admin FROM users WHERE email = $1 LIMIT 1', [email])
    if (res.rows.length > 0) {
        return { email, userId: res.rows[0].id, isAdmin: res.rows[0].is_admin }
    }

    // Auto-provision: user passed allowlist (auth.ts) but has no users row yet
    const name = session.user.name || email.split('@')[0]
    const avatarUrl = session.user.image || null
    const initials = deriveInitials(name)
    const iconColor = pickIconColor()

    const insert = await pool.query(
        `INSERT INTO users (name, email, avatar_url, initials, icon_color)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id, is_admin`,
        [name, email, avatarUrl, initials, iconColor]
    )

    const row = insert.rows[0]
    return { email, userId: row.id, isAdmin: row.is_admin }
}
