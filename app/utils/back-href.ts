import { tripTools } from '@/lib/trip-tools'

/**
 * Where "back" goes from a page — the header ← and exits like delete. A
 * static URL hierarchy derived from the pathname (not browser history), so
 * back always goes "up" even after a deep link or refresh. Pages can
 * override one hop with ?from=<trip-tool-path> (e.g. the insights list
 * links expenses with ?from=graphs so back returns there). Null = no back
 * (home). Pure — unit-testable.
 */
export function getBackHref(
    pathname: string,
    searchParams: { get(name: string): string | null }
): string | null {
    let backHref: string | null = null
    // /gustavo/trips/<slug>/expenses/<id>/edit → expense detail
    const expenseEditMatch = pathname.match(
        /^\/gustavo\/trips\/([^/]+)\/expenses\/([^/]+)\/edit$/
    )
    // /gustavo/trips/<slug>/expenses/<id|new> → expenses list (or ?from tool)
    const expenseDetailMatch = pathname.match(
        /^\/gustavo\/trips\/([^/]+)\/expenses\/.+$/
    )
    // /gustavo/health/exercise/<id>/edit → workout detail; /<id> → workouts
    const workoutEditMatch = pathname.match(
        /^\/gustavo\/health\/exercise\/(\d+)\/edit$/
    )
    const workoutDetailMatch = pathname.match(
        /^\/gustavo\/health\/exercise\/\d+$/
    )
    // /gustavo/health/<section>[/...]/new or /<id>/edit → the list it came from
    const healthFormMatch = pathname.match(
        /^(\/gustavo\/health\/[^/]+(?:\/[^/]+)*?)\/(?:new|[^/]+\/edit)$/
    )
    // /gustavo/health/<section>/(routines|manage|groups) → the section list
    const healthSubListMatch = pathname.match(
        /^(\/gustavo\/health\/[^/]+)\/(?:routines|manage|groups)$/
    )
    // /gustavo/trips/<slug>/edit → trip details
    const tripEditMatch = pathname.match(
        /^\/gustavo\/trips\/([^/]+)\/edit$/
    )
    if (expenseEditMatch) {
        backHref = `/gustavo/trips/${expenseEditMatch[1]}/expenses/${expenseEditMatch[2]}`
    } else if (expenseDetailMatch) {
        const from = searchParams.get('from')
        const fromTool =
            from &&
            from !== 'expenses' &&
            tripTools.some((t) => t.path === from)
                ? from
                : null
        backHref = `/gustavo/trips/${expenseDetailMatch[1]}/${fromTool ?? 'expenses'}`
    } else if (tripEditMatch) {
        backHref = `/gustavo/trips/${tripEditMatch[1]}/details`
    }
    // /gustavo/trips/map (world map) → trips list. Explicit so it doesn't rely
    // on the legacy hub-URL branch treating "map" as a trip slug.
    else if (pathname === '/gustavo/trips/map') {
        backHref = '/gustavo/trips'
    }
    // /gustavo/trips/<slug>/<tool> → trips list
    else if (/^\/gustavo\/trips\/[^/]+\/.+$/.test(pathname)) {
        backHref = '/gustavo/trips'
    }
    // /gustavo/trips/[slug] (legacy hub URL) → trips list
    else if (/^\/gustavo\/trips\/[^/]+$/.test(pathname)) {
        backHref = '/gustavo/trips'
    }
    // /gustavo/trips → home
    else if (pathname === '/gustavo/trips') {
        backHref = '/gustavo'
    }
    // Page-style forms under a health section go back to what they were
    // opened from: /health/exercise/new and /health/exercise/<id>/edit →
    // /health/exercise; /health/exercise/routines/new → .../routines
    else if (workoutEditMatch) {
        backHref = `/gustavo/health/exercise/${workoutEditMatch[1]}`
    } else if (workoutDetailMatch) {
        backHref = '/gustavo/health/exercise'
    } else if (healthFormMatch) {
        backHref = healthFormMatch[1]
    }
    // Sub-list pages under a health section → that section:
    // /health/exercise/routines → workouts; /health/supplements/manage and
    // /health/supplements/groups → supplements
    else if (healthSubListMatch) {
        backHref = healthSubListMatch[1]
    }
    // /gustavo/health/<sub> → health
    else if (/^\/gustavo\/health\/.+$/.test(pathname)) {
        backHref = '/gustavo/health'
    }
    // /gustavo/health → home
    else if (pathname === '/gustavo/health') {
        backHref = '/gustavo'
    }
    // /gustavo/settings/<sub> → settings
    else if (/^\/gustavo\/settings\/.+$/.test(pathname)) {
        backHref = '/gustavo/settings'
    }
    // /gustavo/settings → home
    else if (pathname === '/gustavo/settings') {
        backHref = '/gustavo'
    }
    return backHref
}
