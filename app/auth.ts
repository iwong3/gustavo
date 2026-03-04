import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Add/remove emails here, then push to deploy.
const ALLOWED_EMAILS: string[] = ['ivanwong15@gmail.com']

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [Google],
    callbacks: {
        signIn: ({ user }) => ALLOWED_EMAILS.includes(user.email ?? ''),
        authorized: ({ auth }) => !!auth,
    },
    pages: {
        signIn: '/login',
    },
})
