'use client'

import { Box } from '@mui/material'
import { IconBarbell, IconHeartbeat } from '@tabler/icons-react'
import { usePathname } from 'next/navigation'

import { cardSx, colors } from '@/lib/colors'
import { HealthHubSkeleton } from 'components/health/health-dashboard-v2'
import { HealthPageHeader } from 'components/health/health-page-layout'
import { Bone, Circle, TextBone } from 'components/skeleton/bones'
import { FormSkeleton } from 'components/skeleton/form-skeleton'

// Loading placeholders for the health area, mirroring the loaded pages.
// Used by health/loading.tsx (via HealthRouteSkeleton) and by the pages'
// own loading states (HealthPageLayout's `skeleton`), so a slow load never
// swaps one placeholder for another.

const WORKOUTS_COLOR = '#ffe0b2'
const workoutsIcon = (
    <IconBarbell size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />
)

/**
 * HealthPageLayout's column (maxWidth 600, 16px sides, 8px top, 16px gap).
 * `fullWidth` mirrors the PullToRefresh wrapper pages with onRefresh get.
 */
function HealthColumn({ children, fullWidth }: { children: React.ReactNode; fullWidth?: boolean }) {
    const column = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 600,
                paddingX: 2,
                paddingTop: 1,
                paddingBottom: 2,
                gap: 2,
            }}>
            {children}
        </Box>
    )
    return fullWidth ? <Box sx={{ width: '100%' }}>{column}</Box> : column
}

/** Routine chips under a page header: bolt circle + 26px chips, wrapping. */
function RoutineChipsSkeleton() {
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Circle size={30} />
            {[76, 64, 88].map((w) => (
                <Bone key={w} width={w} height={26} radius="4px" />
            ))}
        </Box>
    )
}

/** Mirrors the Workouts list (app/gustavo/health/exercise/page.tsx). */
export function WorkoutsListSkeleton() {
    return (
        <HealthColumn fullWidth>
            <HealthPageHeader icon={workoutsIcon} title="Workouts" color={WORKOUTS_COLOR}>
                <RoutineChipsSkeleton />
            </HealthPageHeader>
            {/* Timeline: 32px gutter with the line through its centre */}
            <Box sx={{ position: 'relative' }}>
                <Box
                    sx={{
                        position: 'absolute',
                        left: 15,
                        top: 6,
                        bottom: 6,
                        width: 2,
                        backgroundColor: `${colors.primaryBlack}25`,
                    }}
                />
                {[[70, 56, 84], [64, 90], [58, 72, 60], [80, 64]].map((chips, i) => (
                    <Box key={i} sx={{ display: 'flex', marginBottom: 1.5 }}>
                        <Box sx={{ width: 32, display: 'flex', justifyContent: 'center', paddingTop: '1px', flexShrink: 0 }}>
                            <Box sx={{ marginTop: '5px' }}>
                                <Circle size={10} />
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, marginBottom: 1 }}>
                                <Bone width={34} height={18} />
                                <TextBone fontSize={12} width={48} />
                            </Box>
                            <Box sx={{ ...cardSx, padding: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {chips.map((w, j) => (
                                    <Bone key={j} width={w} height={22} />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                ))}
            </Box>
        </HealthColumn>
    )
}

/** Mirrors the workout detail page (components/health/workout-detail.tsx). */
export function WorkoutDetailSkeleton() {
    const divider = <Box sx={{ marginX: 2, marginY: 1.5, borderTop: `1px solid ${colors.primaryBlack}20` }} />
    return (
        <Box sx={{ width: '100%', maxWidth: 450, paddingTop: 1.5, paddingBottom: 1 }}>
            <Box sx={{ paddingX: 2, paddingY: 0.5 }}>
                <TextBone fontSize={20} lineHeight={1.2} width="55%" />
            </Box>
            {divider}
            {/* Muscle groups: label + 2-column stat cards */}
            <Box sx={{ paddingX: 2, paddingBottom: 1 }}>
                <TextBone fontSize={13} width={110} sx={{ marginBottom: 1 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    {[0, 1].map((i) => (
                        <Bone key={i} height={80} radius="4px" />
                    ))}
                </Box>
            </Box>
            {divider}
            {/* Exercises: header + cards */}
            <Box sx={{ paddingX: 2, paddingBottom: 1 }}>
                <TextBone fontSize={13} width={90} sx={{ marginBottom: 1.5 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[0, 1, 2].map((i) => (
                        <Box key={i} sx={{ ...cardSx, backgroundColor: colors.secondaryYellow, padding: 1.5 }}>
                            <TextBone fontSize={14} lineHeight={1.3} width="50%" />
                            <TextBone fontSize={11} width="30%" sx={{ marginTop: 0.25 }} />
                            {[0, 1].map((j) => (
                                <Box key={j} sx={{ display: 'flex', justifyContent: 'space-between', paddingY: 0.4 }}>
                                    <TextBone fontSize={11} width="35%" />
                                    <TextBone fontSize={14} width={40} />
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    )
}

/**
 * Mirrors WorkoutForm: date strip, routines (new only), the muscle-group
 * grid, the exercise picker card, notes.
 */
export function WorkoutFormSkeleton({ isNew = true }: { isNew?: boolean }) {
    return (
        <FormSkeleton
            fields={[
                'date',
                ...(isNew ? (['chips'] as const) : []),
                { block: 450 },
                { block: 300 },
                'notes',
            ]}
        />
    )
}

/** Mirrors the routines list (app/gustavo/health/exercise/routines). */
export function RoutinesSkeleton() {
    return (
        <HealthColumn>
            <HealthPageHeader icon={workoutsIcon} title="Routines" color={WORKOUTS_COLOR} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ ...cardSx, display: 'flex', gap: 1.5, padding: 1.5 }}>
                        <Bone width={16} height={16} sx={{ marginY: 0.5 }} />
                        <Box sx={{ flex: 1 }}>
                            <TextBone fontSize={14} width="40%" sx={{ marginBottom: 0.5 }} />
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {[50, 64, 44].map((w) => (
                                    <Bone key={w} width={w} height={20} />
                                ))}
                            </Box>
                            <TextBone fontSize={11} width="70%" sx={{ marginTop: 0.5 }} />
                        </Box>
                    </Box>
                ))}
            </Box>
        </HealthColumn>
    )
}

/** Generic health sub-page (diet, supplements, …): header chip + cards. */
function HealthSectionSkeleton() {
    return (
        <HealthColumn>
            <HealthPageHeader
                icon={<IconHeartbeat size={20} stroke={2} color={colors.primaryBlack} />}
                title=" "
                color={colors.primaryWhite}
            />
            {[0, 1, 2, 3].map((i) => (
                <Bone key={i} height={64} radius="4px" />
            ))}
        </HealthColumn>
    )
}

/**
 * Skeleton for any route under /gustavo/health, chosen from the URL —
 * health/loading.tsx is the boundary for every nested route, so it can't
 * assume its own page.
 */
export function HealthRouteSkeleton() {
    const pathname = usePathname()
    if (pathname === '/gustavo/health') return <HealthHubSkeleton />
    const sub = pathname.replace(/^\/gustavo\/health\/?/, '')
    if (sub === 'exercise') return <WorkoutsListSkeleton />
    if (sub === 'exercise/new') return <WorkoutFormSkeleton />
    if (/^exercise\/\d+\/edit$/.test(sub)) return <WorkoutFormSkeleton isNew={false} />
    if (/^exercise\/\d+$/.test(sub)) return <WorkoutDetailSkeleton />
    if (sub === 'exercise/routines') return <RoutinesSkeleton />
    return <HealthSectionSkeleton />
}
