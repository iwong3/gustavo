'use client'

import { Box, Typography } from '@mui/material'
import { IconArrowLeft, IconChevronDown } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'
import { tripTools } from '@/lib/trip-tools'
import { FitTripName } from 'components/trip-header-controls'
import { PullToRefresh } from 'components/pull-to-refresh'
import { getTablerIcon } from 'utils/icons'

import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

// Static replica of the app header row (layout.tsx) — avatar, trip name,
// tool pill, back button — so FitTripName renders under real width pressure.
const MockHeader = ({ name, toolIndex = 0 }: { name: string; toolIndex?: number }) => {
    const tool = tripTools[toolIndex]
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                height: 56,
                px: 2,
                backgroundColor: colors.secondaryYellow,
            }}>
            <img
                src="/gus-fring.png"
                alt="Gustavo"
                style={{ width: 36, height: 36, borderRadius: '100%', objectFit: 'cover', display: 'block' }}
            />
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', paddingX: 0.5, gap: 1 }}>
                <FitTripName name={name} onClick={() => {}} />
                <Box sx={{ position: 'relative', flexShrink: 0, marginLeft: 'auto', marginRight: 0.5 }}>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            paddingX: 1.25,
                            height: 34,
                            background: tool.bg,
                            ...hardShadow,
                            borderRadius: '4px',
                        }}>
                        {getTablerIcon({
                            name: tool.icon,
                            size: 18,
                            stroke: 2,
                            color: colors.primaryBlack,
                            fill: colors.primaryWhite,
                        })}
                        <Typography
                            sx={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: colors.primaryBlack,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                whiteSpace: 'nowrap',
                            }}>
                            {tool.name}
                        </Typography>
                        <IconChevronDown size={14} stroke={2.5} />
                    </Box>
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: '4px',
                    color: colors.primaryBlack,
                    backgroundColor: colors.primaryWhite,
                    border: `1px solid ${colors.primaryBlack}`,
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                    flexShrink: 0,
                }}>
                <IconArrowLeft size={18} stroke={2} />
            </Box>
        </Box>
    )
}

export default function HeaderGallery() {
    return (
        <GalleryPage title="Header">
            <SpecimenGroup title="Trip name fit — shrinks font, then wraps to 2–3 lines">
                <Specimen label="short — 17px / 1 line">
                    <MockHeader name="Tokyo" />
                </Specimen>
                <Specimen label="medium — should still fit 1 line or drop to 2">
                    <MockHeader name="Portugal Summer 2026" />
                </Specimen>
                <Specimen label="long — 15px / 2 lines">
                    <MockHeader name="Jenny & Ivan's Grand European Adventure" />
                </Specimen>
                <Specimen label="very long — 12.5px / 3 lines, ellipsis only past this">
                    <MockHeader name="The Absolutely Unnecessary Extremely Long Trip Name That Tests Every Fit Step We Have" />
                </Specimen>
                <Specimen label="long name + wide pill (Insights)">
                    <MockHeader
                        name="Jenny & Ivan's Grand European Adventure"
                        toolIndex={2}
                    />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Pull to refresh — drag list down; ring fills, badge arms yellow">
                <Specimen label="pull-to-refresh (touch device / devtools touch emulation)">
                    <PullToRefresh
                        onRefresh={() => new Promise((r) => setTimeout(r, 1500))}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
                            {Array.from({ length: 6 }, (_, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        height: 48,
                                        borderRadius: '4px',
                                        border: `1px solid ${colors.primaryBlack}`,
                                        backgroundColor: colors.primaryWhite,
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 1.5,
                                    }}>
                                    <Typography sx={{ fontSize: 13 }}>Row {i + 1}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </PullToRefresh>
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
