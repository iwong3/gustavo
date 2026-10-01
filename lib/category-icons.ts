/**
 * Expense-category looks: the curated icon list + color palette the
 * Settings → Categories editor picks from, and the fallbacks.
 *
 * Icons are Phosphor component names (regular weight) — ONE library for
 * category icons, so they all match. The rest of the app's UI icons are
 * Tabler. Need an icon that isn't here? Add another Phosphor name to a group
 * (and to CATEGORY_ICON_COMPONENTS in utils/category-icons.tsx). If Phosphor
 * truly lacks it, draw a custom SVG on Phosphor's 256 grid rather than
 * borrowing from another library.
 *
 * Leaf file (no React) — the API validates against it too.
 */

// The original category icons lead their groups (ForkKnife, Train, Bed +
// MapPinArea, Tote + ArrowsLeftRight, SquaresFour for Other)
export const CATEGORY_ICON_GROUPS = [
    { title: 'Food & drink', icons: ['ForkKnife', 'Coffee', 'BeerStein', 'Wine', 'Martini', 'Hamburger', 'IceCream'] },
    { title: 'Getting around', icons: ['Train', 'Airplane', 'Bus', 'Car', 'Taxi', 'Boat', 'Bicycle', 'GasPump', 'Suitcase'] },
    { title: 'Stay & do', icons: ['Bed', 'MapPinArea', 'Tent', 'Ticket', 'Camera', 'Mountains', 'UmbrellaSimple', 'SwimmingPool', 'FilmSlate', 'Park'] },
    { title: 'Shopping & money', icons: ['Tote', 'ShoppingCart', 'TShirt', 'Gift', 'Money', 'ArrowsLeftRight'] },
    { title: 'Everyday', icons: ['Pill', 'FirstAid', 'Heart', 'Phone', 'WifiHigh', 'Barbell', 'SquaresFour', 'DotsThreeCircle'] },
] as const

export type CategoryIconName = (typeof CATEGORY_ICON_GROUPS)[number]['icons'][number]

const ICON_NAMES = new Set<string>(CATEGORY_ICON_GROUPS.flatMap((g) => g.icons))
export const isCategoryIconName = (v: unknown): v is CategoryIconName =>
    typeof v === 'string' && ICON_NAMES.has(v)

/** The picker's swatches — the first 7 are the pre-00045 category colors. */
export const CATEGORY_COLORS = [
    '#ffd97d',
    '#90be6d',
    '#aed9e0',
    '#ff9b85',
    '#dac4f7',
    '#d3d3d3',
    '#b8d8ba',
    '#a7bed3',
    '#f7cd83',
    '#f4a6c6',
    '#c5e1a5',
    '#ffcc80',
] as const

export const isHexColor = (v: unknown): v is string =>
    typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

export const DEFAULT_CATEGORY_ICON: CategoryIconName = 'SquaresFour'
export const DEFAULT_CATEGORY_COLOR = '#d3d3d3'

/**
 * The name-based looks from before migration 00045 — only a fallback for
 * data cached before the category's own icon/color reached it.
 */
const LEGACY_LOOKS: Record<string, { icon: CategoryIconName; color: string }> = {
    'Food': { icon: 'ForkKnife', color: '#ffd97d' },
    'Shopping': { icon: 'Tote', color: '#90be6d' },
    'Transit': { icon: 'Train', color: '#aed9e0' },
    'Attraction': { icon: 'MapPinArea', color: '#ff9b85' },
    'Lodging': { icon: 'Bed', color: '#dac4f7' },
    'Currency Exchange': { icon: 'ArrowsLeftRight', color: '#b8d8ba' },
}

export type CategoryLook = { icon: CategoryIconName; color: string }

/** A category's icon + color: its own when set, else the legacy name
 *  mapping, else the default ("Other") look. */
export function getCategoryLook(
    name: string | null | undefined,
    icon?: string | null,
    color?: string | null
): CategoryLook {
    const legacy = name ? LEGACY_LOOKS[name] : undefined
    return {
        icon: isCategoryIconName(icon) ? icon : (legacy?.icon ?? DEFAULT_CATEGORY_ICON),
        color: isHexColor(color) ? color : (legacy?.color ?? DEFAULT_CATEGORY_COLOR),
    }
}
