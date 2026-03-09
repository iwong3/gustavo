// Shared form field styles for the neo-brutalist design system.
// Import these instead of defining inline styles in form components.
// See lib/colors.ts for the full design system overview.
//
// Exports:
//   labelSx / errorLabelSx   — field label typography
//   fieldSx / errorFieldSx   — MUI TextField/Select/Autocomplete sx props
//   errorMessageSx           — inline error text
//   fieldShadow              — raw shadow string (for custom uses like ToggleButtonGroup)
//   dropdownPaperSx          — MUI Select/Autocomplete dropdown paper styling
//   dropdownMenuItemSx       — MUI MenuItem styling inside dropdowns
//
// States:
//   Default — black border, black 2px offset shadow
//   Focus   — yellow border, yellow 2px offset shadow
//   Error   — red border, red 2px offset shadow (stays red even when focused)

import { colors } from './colors'

// ── Label styles ──────────────────────────────────────────────────────────────

export const labelSx = {
    fontWeight: 600,
    fontSize: 13,
    color: colors.primaryBlack,
    marginBottom: 0.5,
} as const

export const errorLabelSx = {
    ...labelSx,
    color: colors.primaryRed,
} as const

// ── Field styles ──────────────────────────────────────────────────────────────

export const fieldShadow = `2px 2px 0px ${colors.primaryBlack}`
const focusShadow = `2px 2px 0px ${colors.primaryYellow}`
const errorShadow = `2px 2px 0px ${colors.primaryRed}`

/**
 * Standard form field styling — black border, hard shadow, yellow focus.
 * Works on TextField, Select (standalone or inside FormControl), and Autocomplete inputs.
 */
export const fieldSx = {
    'backgroundColor': colors.primaryWhite,
    'borderRadius': '4px',
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.primaryBlack,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.primaryBlack,
    },
    // Focused state — yellow border + shadow
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.primaryYellow,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: colors.primaryYellow,
    },
    // Shadow for TextField wrapper (OutlinedInput is a child)
    '& .MuiOutlinedInput-root': {
        boxShadow: fieldShadow,
    },
    '& .MuiOutlinedInput-root.Mui-focused': {
        boxShadow: focusShadow,
    },
    // Shadow for standalone Select (it IS the OutlinedInput root)
    '&.MuiOutlinedInput-root': {
        boxShadow: fieldShadow,
    },
    '&.MuiOutlinedInput-root.Mui-focused': {
        boxShadow: focusShadow,
    },
    '& input[type="date"]': {
        textAlign: 'left',
    },
    '& input[type="date"]::-webkit-date-and-time-value': {
        textAlign: 'left',
    },
} as const

/** Error variant — red border + shadow, overrides focus styles too. */
export const errorFieldSx = {
    ...fieldSx,
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: `${colors.primaryRed} !important`,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: `${colors.primaryRed} !important`,
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: `${colors.primaryRed} !important`,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: `${colors.primaryRed} !important`,
    },
    '& .MuiOutlinedInput-root': {
        boxShadow: errorShadow,
    },
    '& .MuiOutlinedInput-root.Mui-focused': {
        boxShadow: errorShadow,
    },
    '&.MuiOutlinedInput-root': {
        boxShadow: errorShadow,
    },
    '&.MuiOutlinedInput-root.Mui-focused': {
        boxShadow: errorShadow,
    },
} as const

// ── Dropdown menu styles ─────────────────────────────────────────────────────

/** Paper/container for Select and Autocomplete dropdown menus. */
export const dropdownPaperSx = {
    backgroundColor: colors.primaryWhite,
    border: `1px solid ${colors.primaryBlack}`,
    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
    borderRadius: '12px',
    marginTop: '4px',
} as const

/** MenuItem styles inside dropdown menus — yellow hover + selected states. */
export const dropdownMenuItemSx = {
    'fontSize': 13,
    'minHeight': 32,
    '&:hover': {
        backgroundColor: `${colors.primaryYellow}40`,
    },
    '&.Mui-selected': {
        'backgroundColor': colors.primaryYellow,
        'fontWeight': 600,
        '&:hover': {
            backgroundColor: colors.primaryYellow,
        },
    },
} as const

/**
 * MenuProps for MUI Select components — pass as MenuProps={{ ... }}.
 * Combines dropdownPaperSx + dropdownMenuItemSx.
 */
export const selectMenuProps = {
    PaperProps: {
        sx: {
            ...dropdownPaperSx,
            '& .MuiMenuItem-root': dropdownMenuItemSx,
        },
    },
} as const

// ── Error message ─────────────────────────────────────────────────────────────

export const errorMessageSx = {
    color: colors.primaryRed,
    fontWeight: 600,
} as const
