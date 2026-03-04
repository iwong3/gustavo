export { auth as middleware } from '@/auth'

export const config = {
    // Protect all routes except auth endpoints, login page, and static assets
    matcher: [
        '/((?!api/auth|login|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
    ],
}
