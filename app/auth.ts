import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [Google],
    callbacks: {
        signIn: async ({ user }) => {
            const email = user.email
            if (!email) return false
            // Dynamic import: pg can't be bundled for Edge middleware
            const { default: pool } = await import('@/lib/db')
            const res = await pool.query(
                'SELECT 1 FROM allowed_emails WHERE LOWER(email) = LOWER($1) LIMIT 1',
                [email]
            )
            return res.rows.length > 0
        },
        authorized: ({ auth }) => !!auth,
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
})
