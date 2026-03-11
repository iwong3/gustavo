'use client'

import { Box, Link, Typography } from '@mui/material'
import { IconExternalLink, IconMapPin } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'

import type { PlaceInfo } from '@/lib/types'

interface DrawerMapSectionProps {
    place: PlaceInfo
    children?: React.ReactNode // rendered between name card and map embed
}

export const DrawerMapSection = ({ place, children }: DrawerMapSectionProps) => {
    const mapsUrl = place.googlePlaceId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.googlePlaceId}`
        : place.lat && place.lng
            ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
            : null

    const embedQuery = encodeURIComponent(
        place.name + (place.address ? ', ' + place.address : '')
    )

    return (
        <Box sx={{ mx: 2.5, mb: 2 }}>
            {/* Place name + address card — full-width clickable */}
            {mapsUrl ? (
                <Link
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.25,
                        mb: 1,
                        borderRadius: '4px',
                        ...hardShadow,
                        backgroundColor: colors.primaryWhite,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: colors.secondaryYellow,
                        },
                        transition: 'background-color 150ms ease',
                    }}>
                    <IconMapPin size={16} color={colors.primaryBlack} style={{ flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 14,
                                fontWeight: 600,
                                lineHeight: 1.3,
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
                                    fontSize: 12,
                                    color: 'text.secondary',
                                    lineHeight: 1.3,
                                    mt: 0.25,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                {place.address}
                            </Typography>
                        )}
                    </Box>
                    <IconExternalLink size={16} color={colors.primaryBlack} style={{ flexShrink: 0 }} />
                </Link>
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 0.75,
                        mb: 1,
                    }}>
                    <IconMapPin size={16} color={colors.primaryBlack} style={{ marginTop: 2, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 14,
                                fontWeight: 600,
                                lineHeight: 1.3,
                                color: colors.primaryBlack,
                            }}>
                            {place.name}
                        </Typography>
                        {place.address && (
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: 'text.secondary',
                                    lineHeight: 1.3,
                                    mt: 0.25,
                                }}>
                                {place.address}
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}

            {/* Slot for metadata between card and embed */}
            {children}

            {/* Map embed */}
            {place.lat && place.lng && (
                <Box
                    sx={{
                        position: 'relative',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        ...hardShadow,
                    }}>
                    <iframe
                        src={`https://www.google.com/maps?q=${embedQuery}&output=embed`}
                        width="100%"
                        height="250"
                        style={{ border: 0, display: 'block', pointerEvents: 'none' }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                    {/* Transparent overlay — opens Maps in new tab */}
                    {mapsUrl && (
                        <Link
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ position: 'absolute', inset: 0 }}
                        />
                    )}
                </Box>
            )}
        </Box>
    )
}
