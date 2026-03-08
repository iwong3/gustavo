'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { fetchUsers } from 'utils/api'
import type { UserSummary } from '@/lib/types'

let cachedUsers: UserSummary[] | null = null

export function useCurrentUser() {
    const { data: session } = useSession()
    const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)

    useEffect(() => {
        if (!session?.user?.email) return

        const resolve = (users: UserSummary[]) => {
            const me = users.find((u) => u.email === session.user!.email)
            if (me) setCurrentUser(me)
        }

        if (cachedUsers) {
            resolve(cachedUsers)
        } else {
            fetchUsers()
                .then((users) => {
                    cachedUsers = users
                    resolve(users)
                })
                .catch(() => {})
        }
    }, [session?.user?.email])

    return currentUser
}
