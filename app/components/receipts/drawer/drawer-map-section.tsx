'use client'

import { Box, Link, Typography } from '@mui/material'
import { IconMapPin, IconMap, IconWorld } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'
import { formatPlacePrice, formatRating, humanizePlaceType } from '@/lib/place-display'

import type { PlaceInfo } from '@/lib/types'

// One unit: chips float ON the map, the place bar is its base. Previously these
// were three stacked elements (chip row, place card, map) — merging them is the
// biggest space win on the page, and it reads more like a Maps card.
//
// Chips answer "what was this place?" — rating with its count, what it actually
// cost, what kind of place it is. Hours are deliberately absent: the Maps button
// is one tap away and Google always has fresher hours than our cache.

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

/** Maps / Site — distinct fills + icons so it's obvious they're two different
 *  destinations. The bar itself is NOT a link: with two buttons in it, an
 *  ambient tap target would make "what happens if I tap here?" unanswerable. */
const LinkButton = ({
    href,
    icon,
    label,
    background,
}: {
    href: string
    icon: React.ReactNode
    label: string
    background: string
}) => (
    <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
            'display': 'flex',
            'alignItems': 'center',
            'justifyContent': 'center',
            'gap': 0.5,
            'height': 30,
            'paddingX': 1.25,
            'flexShrink': 0,
            'borderRadius': '4px',
            ...hardShadow,
            'backgroundColor': background,
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
        {icon}
        {label}
    </Link>
)

export const DrawerMapSection = ({ place }: DrawerMapSectionProps) => {
    const mapsUrl = place.googlePlaceId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googlePlaceId}`
        : place.lat != null && place.lng != null
          ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
          : null

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
                    {/* Top-RIGHT: Google renders its own "Open in Google Maps"
                        button in the top-left of the embed, and chips there
                        covered its label. Right-aligned so a long price range
                        grows away from it. pointerEvents:none so chips never
                        eat a pan gesture. */}
                    {chips.length > 0 && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                // Half the width leaves clear air for Google's
                                // "Open in Maps" pill; chips wrap rather than
                                // creep left into it.
                                maxWidth: '50%',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: CHIP_GAP,
                                flexWrap: 'wrap',
                                pointerEvents: 'none',
                            }}>
                            {chips.map((c) => (
                                <Chip key={c} label={c} />
                            ))}
                        </Box>
                    )}
                </Box>
            )}

            {/* Place bar — the map's base, or a standalone card when we have no
                coordinates to render */}
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

                <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                    {mapsUrl && (
                        <LinkButton
                            href={mapsUrl}
                            icon={<IconMap size={13} />}
                            label="Maps"
                            background="#e4edf7"
                        />
                    )}
                    {place.website && (
                        <LinkButton
                            href={place.website}
                            icon={<IconWorld size={13} />}
                            label="Site"
                            background={colors.secondaryYellow}
                        />
                    )}
                </Box>
            </Box>

            {/* Chips have nowhere to float without a map — show them below */}
            {!hasMap && chips.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: CHIP_GAP,
                        flexWrap: 'wrap',
                        padding: '0 9px 9px',
                        backgroundColor: colors.primaryWhite,
                    }}>
                    {chips.map((c) => (
                        <Chip key={c} label={c} />
                    ))}
                </Box>
            )}
        </Box>
    )
}
