import AppShell from './app-shell'

/**
 * Every page under /gustavo is a client component that loads its data from
 * react-query, so the server's render is a data-free shell — identical for
 * every user. Rendering it statically lets Vercel's CDN serve it (and every
 * RSC prefetch) instead of a per-request function in iad1: routes with a
 * [slug]/[id] segment were `ƒ` and cost ~150ms warm / ~530ms cold per
 * navigation. They're now generated on first visit and cached (ISR, no
 * revalidation — a deploy replaces them).
 *
 * Auth is unaffected: middleware.ts gates every request before the cache,
 * exactly as it already did for the plain static routes. Never read
 * cookies()/headers()/auth() in a server component under here — force-static
 * silently makes them empty, and anything per-user must never reach a cached
 * payload.
 */
export const dynamic = 'force-static'

export default function GustavoLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>
}
