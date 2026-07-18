export { auth as middleware } from '@/auth'

export const config = {
    // Protect all routes except auth endpoints, login page, and static assets.
    // dev/gallery is fixture-only and 404s in production (see app/dev/gallery/layout.tsx),
    // so it skips auth for zero-friction local use.
    matcher: [
        '/((?!api/auth|auth/|login|dev/gallery|geo/|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
    ],
}
