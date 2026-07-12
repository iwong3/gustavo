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
//     don't let padding+font size determine height implicitly. Known heights:
//     header buttons/pill 34px, search input + toolbar buttons 36px.
//   - Consistent gaps: siblings in a row/stack use one `gap` value, not ad-hoc
//     per-element margins. Common gaps: tight 0.75–1 (6–8px), sections 1.5–2.
//   - Tap targets ≥ 34px; icons optically centered within them.
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
