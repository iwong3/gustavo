'use client'

/**
 * Loading placeholders for the home page, mirroring the loaded components so
 * the frame of the page is right while data lands (code-guide § Loading):
 * the departures board, the quick-action row, and the Health cards' board
 * frames. Chrome that's always there (board strips, card outlines, header
 * colours) is drawn as itself; only the data is placeholder.
 */
import { Box } from '@mui/material'

import { colors } from '@/lib/colors'
import { Bone, ChromeBox, Circle, TextBone } from 'components/skeleton/bones'

// Departures board palette (components/departures-board.tsx)
const BOARD_HEAD = '#c9a877'
const BOARD_PANEL = '#866340'
/** Flap tiles and meta text on the brown panel, as faint shapes. */
const ON_PANEL = 'rgba(243, 234, 214, 0.28)'
const CELLS = 14

/** The departures board: sand strips, brown panel, empty flap tiles. */
export function BoardSkeleton() {
    const strip = (height: number, withPill: boolean) => (
        <Box
            sx={{
                height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingX: 1.75,
                backgroundColor: BOARD_HEAD,
            }}>
            <Box sx={{ width: 84, height: 8, borderRadius: '3px', backgroundColor: 'rgba(9, 4, 1, 0.18)' }} />
            {withPill && (
                <Box
                    sx={{
                        width: 72,
                        height: 18,
                        borderRadius: 999,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        backgroundColor: 'rgba(243, 234, 214, 0.7)',
                    }}
                />
            )}
        </Box>
    )
    return (
        <Box
            aria-hidden="true"
            sx={{
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '8px',
                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                overflow: 'hidden',
            }}>
            <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}` }}>{strip(34, true)}</Box>
            <Box sx={{ backgroundColor: BOARD_PANEL, paddingX: 1.5, paddingY: 1.25 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${CELLS}, 1fr)`, gap: '2px' }}>
                    {Array.from({ length: CELLS }, (_, i) => (
                        <Box key={i} sx={{ height: 27, borderRadius: '2px', backgroundColor: ON_PANEL }} />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 1.25, height: 18, alignItems: 'center' }}>
                    <Box sx={{ width: 110, height: 9, borderRadius: '3px', backgroundColor: ON_PANEL }} />
                    <Box sx={{ width: 72, height: 9, borderRadius: '3px', backgroundColor: ON_PANEL }} />
                </Box>
            </Box>
            <Box sx={{ borderTop: `1px solid ${colors.primaryBlack}` }}>{strip(22, false)}</Box>
        </Box>
    )
}

/** The Add expense / Weigh-in row: `count` outlined shells, two to a row. */
export function QuickActionsSkeleton({ count }: { count: 1 | 2 }) {
    return (
        <Box aria-hidden="true" sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {Array.from({ length: count }, (_, i) => (
                <ChromeBox
                    key={i}
                    height={70}
                    sx={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <TextBone fontSize={15} lineHeight={1.1} width="70%" />
                    <TextBone fontSize={10.5} lineHeight={1.3} width="85%" />
                </ChromeBox>
            ))}
        </Box>
    )
}

/**
 * A Health card (BoardCard frame): its real coloured strip with a title
 * placeholder, an optional quick-log row (Workouts) or day meter
 * (Supplements), and `rows` full-width row bands.
 */
export function HomeCardSkeleton({
    headerBg,
    rows,
    logRow = false,
    meter = false,
}: {
    headerBg: string
    rows: number
    logRow?: boolean
    meter?: boolean
}) {
    return (
        <Box
            aria-hidden="true"
            sx={{
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '8px',
                backgroundColor: colors.primaryWhite,
                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                overflow: 'hidden',
            }}>
            <Box
                sx={{
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    paddingX: 1.75,
                    backgroundColor: headerBg,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                }}>
                <Box sx={{ width: 96, height: 8, borderRadius: '3px', backgroundColor: 'rgba(9, 4, 1, 0.16)' }} />
            </Box>
            <Box sx={{ padding: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {logRow && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Circle size={26} />
                        <Bone width={72} height={24} />
                        <Bone width={68} height={24} />
                        <Bone width={48} height={24} />
                    </Box>
                )}
                {meter && <Bone height={8} />}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', marginX: -1.5, marginBottom: -1.5 }}>
                    {Array.from({ length: rows }, (_, i) => (
                        <Box
                            key={i}
                            sx={{
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                paddingX: 1.75,
                                backgroundColor: i % 2 ? '#fbf6ec' : '#f7f0e2',
                            }}>
                            <TextBone fontSize={13.5} lineHeight={1.2} width={`${38 + ((i * 17) % 22)}%`} />
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    )
}
