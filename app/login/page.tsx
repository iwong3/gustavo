import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LoginClient from './login-client'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const session = await auth()
    if (session) redirect('/gustavo')
    const { error } = await searchParams
    return <LoginClient error={error} />
}
