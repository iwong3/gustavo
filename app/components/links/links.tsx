import { Box, Link, Typography } from '@mui/material'

import { cardSx, colors, pressShadowSx } from '@/lib/colors'
import { PageTitleRow } from 'components/page-title-row'
import { useTripData } from 'providers/trip-data-provider'
import { getTablerIcon } from 'utils/icons'
import { Link as LinkType, LinksByTripSlug, getLogoFromLinkType } from 'utils/links'

// Section label — same as the debts page's section headings
const sectionLabelSx = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: colors.primaryBrown,
    marginTop: 0.5,
} as const

export const Links = () => {
    const { trip } = useTripData()
    const tripLinks = LinksByTripSlug[trip.slug] ?? []

    const personalLinks = tripLinks.filter((link) => link.personal)
    const externalLinks = tripLinks.filter((link) => !link.personal)

    const renderLink = (link: LinkType) => (
        <Link
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            underline="none"
            sx={{
                ...cardSx,
                ...pressShadowSx,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1.5,
                paddingX: 2,
                paddingY: 1.5,
                fontSize: 14,
                fontWeight: 600,
            }}>
            <Box sx={{ minWidth: 0 }}>{link.name}</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {link.type ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={getLogoFromLinkType(link.type)}
                        alt=""
                        style={{ width: 20, height: 20, objectFit: 'contain' }}
                    />
                ) : (
                    getTablerIcon({ name: 'IconExternalLink' })
                )}
            </Box>
        </Link>
    )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <PageTitleRow title="Links" />
            {personalLinks.length > 0 && (
                <Typography sx={sectionLabelSx}>Personal resources</Typography>
            )}
            {personalLinks.map(renderLink)}
            {externalLinks.length > 0 && (
                <Typography sx={sectionLabelSx}>Other resources</Typography>
            )}
            {externalLinks.map(renderLink)}
        </Box>
    )
}
