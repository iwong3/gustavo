import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// whitelist for app access
const ALLOWED_EMAILS: string[] = [
    'ivanwong15@gmail.com',
    'jennyjiayimei@gmail.com',
    'joannamei11@gmail.com',
    'aibek.asm@gmail.com',
    'angela.moy48@gmail.com',
    'dennismoy18@gmail.com',
    'michellec0897@gmail.com',
]

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [Google],
    callbacks: {
        signIn: ({ user }) => ALLOWED_EMAILS.includes(user.email ?? ''),
        authorized: ({ auth }) => !!auth,
    },
    pages: {
        signIn: '/login',
        error: '/auth/error',
    },
})
