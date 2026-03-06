import { createTheme } from '@mui/material/styles'
import { colors } from '@/lib/colors'

// Neo-brutalist shadow: solid, no blur, close offset
const cardShadow = `2px 2px 0px ${colors.primaryBlack}`
const cardShadowHover = `1px 1px 0px ${colors.primaryBlack}`
const cardShadowActive = `1px 1px 0px ${colors.primaryBlack}`

export const theme = createTheme({
    palette: {
        primary: {
            main: colors.primaryYellow,
            contrastText: colors.primaryBlack,
        },
        background: {
            default: colors.secondaryYellow,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    backgroundColor: colors.primaryWhite,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    color: colors.primaryBlack,
                    boxShadow: cardShadow,
                    textTransform: 'none',
                    '&:hover': {
                        backgroundColor: colors.primaryWhite,
                        boxShadow: cardShadowHover,
                    },
                    '&:active': {
                        boxShadow: cardShadowActive,
                        transform: 'translate(1px, 1px)',
                    },
                    '&.Mui-disabled': {
                        backgroundColor: colors.primaryWhite,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        opacity: 0.45,
                        boxShadow: 'none',
                    },
                },
            },
        },
        MuiFab: {
            styleOverrides: {
                root: {
                    backgroundColor: colors.primaryWhite,
                    border: `2px solid ${colors.primaryBlack}`,
                    color: colors.primaryBlack,
                    boxShadow: cardShadow,
                    '&:hover': {
                        backgroundColor: colors.primaryWhite,
                        boxShadow: cardShadowHover,
                    },
                    '&:active': {
                        boxShadow: cardShadowActive,
                        transform: 'translate(1px, 1px)',
                    },
                },
            },
        },
    },
})
