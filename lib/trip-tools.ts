// Registry of the per-trip tool pages, shared by the header tool-switcher
// pill and any page that needs tool metadata. Leaf file — must not import
// from component files (circular-import rule).

export type TripTool = {
    name: string
    path: string
    icon: string // Tabler icon name, rendered via utils/icons getTablerIcon
    bg: string // pill / tile background (color or gradient)
}

export const tripTools: TripTool[] = [
    {
        name: 'Expenses',
        path: 'expenses',
        icon: 'IconReceipt',
        bg: '#dae6a3',
    },
    {
        name: 'Debts',
        path: 'debts',
        icon: 'IconPigMoney',
        bg: '#f0b8b4',
    },
    {
        name: 'Insights',
        path: 'graphs',
        icon: 'IconChartBar',
        bg: 'linear-gradient(135deg, #f0b490 0%, #cdbfdb 100%)',
    },
    {
        name: 'Links',
        path: 'links',
        icon: 'IconExternalLink',
        bg: '#b4cedf',
    },
    {
        name: 'Activity',
        path: 'activity',
        icon: 'IconLayoutList',
        bg: '#cdbfdb',
    },
    {
        name: 'Trip',
        path: 'details',
        icon: 'IconInfoCircle',
        bg: '#f7cd83',
    },
]

// Resolve the active tool from a pathname like /gustavo/trips/<slug>/<tool>[/...]
export const getActiveTripTool = (pathname: string): TripTool | null => {
    const match = pathname.match(/^\/gustavo\/trips\/[^/]+\/([^/]+)/)
    if (!match) return null
    return tripTools.find((t) => t.path === match[1]) ?? null
}

// Extract the trip slug from any /gustavo/trips/<slug>... pathname
export const getTripSlug = (pathname: string): string | null => {
    const match = pathname.match(/^\/gustavo\/trips\/([^/]+)/)
    return match ? match[1] : null
}
