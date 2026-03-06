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
