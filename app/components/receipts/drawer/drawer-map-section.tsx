'use client'

import { Box, Link, Typography } from '@mui/material'
import { IconMapPin, IconWorld } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'
import { formatPlacePrice, formatRating, humanizePlaceType } from '@/lib/place-display'

import type { PlaceInfo } from '@/lib/types'

// One unit: map, then the place's identity beneath it.
//
// Chips answer "what was this place?" — rating with its count, what it actually
// cost, what kind of place it is. Hours are deliberately absent: Google's own
// "Open in Maps" control is right there on the embed and always has fresher
// hours than our cache.
//
// No "Maps" button of our own: the embed already renders Google's, and two
// buttons doing the same thing is just clutter competing for the same tap.

const CHIP_GAP = 0.75

interface DrawerMapSectionProps {
    place: PlaceInfo
}

const Chip = ({ label }: { label: string }) => (
    <Typography
        sx={{
            fontSize: 11,
            fontWeight: 700,
            color: colors.primaryBlack,
            backgroundColor: colors.primaryWhite,
            paddingX: 1,
            paddingY: 0.25,
            borderRadius: '4px',
            border: `1px solid ${colors.primaryBlack}`,
            boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
            whiteSpace: 'nowrap',
        }}>
        {label}
    </Typography>
)

/** The venue's own site — the one destination Google's embed can't take you to. */
const SiteButton = ({ href }: { href: string }) => (
    <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
            'display': 'flex',
            'alignItems': 'center',
            'justifyContent': 'center',
            'gap': 0.5,
            'height': 26,
            'paddingX': 1.25,
            'flexShrink': 0,
            'marginLeft': 'auto',
            'borderRadius': '4px',
            ...hardShadow,
            'backgroundColor': colors.secondaryYellow,
            'color': colors.primaryBlack,
            'textDecoration': 'none',
            'fontSize': 11,
            'fontWeight': 800,
            'whiteSpace': 'nowrap',
            'transition': 'transform 0.1s, box-shadow 0.1s',
            '&:active': {
                boxShadow: 'none',
                transform: 'translate(2px, 2px)',
            },
        }}>
        <IconWorld size={13} />
        Site
    </Link>
)

export const DrawerMapSection = ({ place }: DrawerMapSectionProps) => {
    const embedQuery = encodeURIComponent(
        place.name + (place.address ? ', ' + place.address : '')
    )

    const chips = [
        formatRating(place.rating, place.userRatingCount),
        formatPlacePrice(place),
        humanizePlaceType(place.primaryType),
    ].filter((c): c is string => !!c)

    const hasMap = place.lat != null && place.lng != null

    return (
        <Box
            sx={{
                marginX: 2.5,
                marginBottom: 2,
                borderRadius: '4px',
                overflow: 'hidden',
                ...hardShadow,
            }}>
            {hasMap && (
                <Box sx={{ position: 'relative', lineHeight: 0 }}>
                    {/* Interactive: pan/zoom inside the embed. It used to carry
                        pointerEvents:'none' with a transparent link over it, so
                        the whole map was one big "open in Maps" target — that
                        overlay is gone (the place bar has explicit buttons now),
                        so the map is live. */}
                    <iframe
                        title={`Map of ${place.name}`}
                        src={`https://www.google.com/maps?q=${embedQuery}&output=embed`}
                        width="100%"
                        height="200"
                        style={{ border: 0, display: 'block' }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </Box>
            )}

            {/* Identity: name + address. Nothing overlays the map any more —
                chips there sat on Google's own "Open in Maps" control. */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    padding: '8px 9px',
                    backgroundColor: colors.primaryWhite,
                    ...(hasMap && { borderTop: `1px solid ${colors.primaryBlack}` }),
                }}>
                <IconMapPin size={16} color={colors.primaryBlack} style={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.25,
                            color: colors.primaryBlack,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                        {place.name}
                    </Typography>
                    {place.address && (
                        <Typography
                            sx={{
                                fontSize: 11,
                                lineHeight: 1.25,
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                            {place.address}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Metadata: chips left, Site right. Collapses entirely when Google
                gave us neither — no empty strip. */}
            {(chips.length > 0 || place.website) && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: CHIP_GAP,
                        flexWrap: 'wrap',
                        padding: '0 9px 9px',
                        backgroundColor: colors.primaryWhite,
                    }}>
                    {chips.map((c) => (
                        <Chip key={c} label={c} />
                    ))}
                    {place.website && <SiteButton href={place.website} />}
                </Box>
            )}
        </Box>
    )
}
