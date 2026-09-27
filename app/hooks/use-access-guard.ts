'use client'

import { useEffect } from 'react'

import { useSignOut } from 'hooks/use-sign-out'

/** At most one check per this long, however often the app is refocused. */
const CHECK_INTERVAL_MS = 60_000

/**
 * Sign out (wiping cached data) when the server stops accepting this session:
 * removed from the allowlist, or the session expired. Checked on open and
 * whenever the app returns to the foreground — a PWA can sit open for days
 * without a page load, so middleware alone never sends it to /login.
 * Offline / network errors are ignored.
 */
export function useAccessGuard() {
    const signOutAndClear = useSignOut()

    useEffect(() => {
        let lastCheck = 0
        let signingOut = false

        const check = async () => {
            if (signingOut || Date.now() - lastCheck < CHECK_INTERVAL_MS) return
            lastCheck = Date.now()
            try {
                const res = await fetch('/api/users/me')
                // Removed from the allowlist → the route's 401. No session at
                // all → middleware redirects to /login, which fetch follows.
                const toLogin = res.redirected && new URL(res.url).pathname === '/login'
                if (res.status === 401 || toLogin) {
                    signingOut = true
                    await signOutAndClear()
                }
            } catch {
                // Offline — try again next time
            }
        }

        const onVisible = () => {
            if (document.visibilityState === 'visible') void check()
        }

        void check()
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [signOutAndClear])
}
