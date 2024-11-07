import { Box, Link } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { Link as LinkType, LinksByTrip } from 'helpers/links'
import { useTripsStore } from 'views/trips'

export const Links = () => {
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    const personalLinks = LinksByTrip.get(currentTrip)!.filter((link) => {
        return link.personal
    })

    const externalLinks = LinksByTrip.get(currentTrip)!.filter((link) => {
        return !link.personal
    })

    const renderLink = (link: LinkType) => {
        return (
            <Link
                key={link.name}
                href={link.url}
                target="_blank"
                color="inherit"
                underline="none"
                sx={{
                    display: 'flex',
                    width: '100%',
                }}>
                <Box
                    sx={{
                        'display': 'flex',
                        'alignItems': 'center',
                        'padding': 2,
                        'marginBottom': 1,
                        'width': '100%',
                        'border': '1px solid #FBBC04',
                        'borderRadius': '10px',
                        'backgroundColor': '#FFFCEE',
                        'fontSize': 14,
                        '&:hover': {
                            backgroundColor: '#fcefb4',
                        },
                        'transition': 'background-color 0.2s ease-out',
                    }}>
                    {link.name}
                </Box>
            </Link>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                marginX: 2,
            }}>
            {personalLinks.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 1,
                        fontSize: 18,
                    }}>
                    Personal Resources
                </Box>
            )}
            {personalLinks.map((link) => renderLink(link))}
            {externalLinks.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: 1,
                        marginBottom: 1,
                        fontSize: 18,
                    }}>
                    Other Resources
                </Box>
            )}
            {externalLinks.map((link) => renderLink(link))}
        </Box>
    )
}
