// ── Gustavo Design System ─────────────────────────────────────────────────────
//
// Visual style: Neo-brutalist
//   - Hard black borders (1px solid primaryBlack) with offset box shadows (2px 2px 0px)
//   - No blur, no soft shadows — clean, hard-edged aesthetic
//   - Warm off-white backgrounds (primaryWhite), yellow accents (primaryYellow)
//
// Key patterns:
//   - Cards/containers: `cardSx` or `hardShadow` (below)
//   - Form fields: see `lib/form-styles.ts` for fieldSx, errorFieldSx, labels, etc.
//   - Selected/active states: primaryYellow background
//   - Error states: primaryRed border + shadow + text
//   - Focus states: primaryYellow border + shadow
//
// Layout polish checklist — apply to every UI change:
//   - Elements sharing a row get the same explicit height (when it makes sense):
//     don't let padding+font size determine height implicitly. Standard control
//     height: 34px (header back button + pill, search input, toolbar buttons).
//   - Consistent gaps: siblings in a row/stack use one `gap` value, not ad-hoc
//     per-element margins. Common gaps: tight 0.75–1 (6–8px), sections 1.5–2.
//   - Tap targets ≥ 34px; icons optically centered within them.
//   - Every tap target has press feedback: pressShadowSx / pressRowSx /
//     pressIconSx (below) — never a hover-only state (hover sticks on iOS).
//   - Don't reserve empty space for conditionally-rendered rows — collapse them.
//   - After building, compare against a neighboring screen for spacing drift.
//
// ──────────────────────────────────────────────────────────────────────────────

export const colors = {
    primaryYellow: '#f7cd83',
    secondaryYellow: '#fefae0',
    primaryBlack: '#090401',
    primaryRed: '#74150f',
    primaryGreen: '#393a10',
    primaryBlue: '#4b6981',
    primaryBrown: '#533b23',
    primaryWhite: '#fffdf7',
} as const

// Reusable hard-shadow border — the signature look used on cards, buttons, etc.
export const hardShadow = {
    border: `1px solid ${colors.primaryBlack}`,
    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
} as const

// Shared card style — border + shadow + white background. Add borderRadius per usage.
export const cardSx = {
    border: `1px solid ${colors.primaryBlack}`,
    backgroundColor: colors.primaryWhite,
    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
    borderRadius: '4px',
} as const

// ── Press feedback ──────────────────────────────────────────────────────────
// Every tap target gets one. The grey iOS tap-highlight is disabled globally
// (globals.css), so without these a tap shows nothing until the next screen
// paints — on a slow load that reads as a missed tap. Pick by element type:

/** Bordered + hard-shadow buttons/cards: presses "into" its shadow. */
export const pressShadowSx = {
    'transition': 'transform 0.1s, box-shadow 0.1s',
    '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
} as const

/** List rows and flat tappable surfaces: a yellow tint while held. */
export const pressRowSx = {
    'transition': 'background-color 0.1s',
    '&:active': { backgroundColor: `${colors.primaryYellow}59` }, // ~35%
} as const

/** Tappable text (a title, a collapsible header): dims while held. */
export const pressTextSx = {
    'transition': 'opacity 0.1s',
    '&:active': { opacity: 0.55 },
} as const

/** Bare icons and tab-bar items: a slight shrink. */
export const pressIconSx = {
    'transition': 'transform 0.1s ease-out',
    '&:active': { transform: 'scale(0.9)' },
} as const
