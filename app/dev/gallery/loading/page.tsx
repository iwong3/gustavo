'use client'

import { Box } from '@mui/material'

import { colors } from '@/lib/colors'
import { HealthHubSkeleton } from 'components/health/health-dashboard-v2'
import {
    RoutinesSkeleton,
    WorkoutDetailSkeleton,
    WorkoutFormSkeleton,
    WorkoutsListSkeleton,
} from 'components/skeleton/health-skeletons'
import { FormSkeleton } from 'components/skeleton/form-skeleton'
import {
    ActivitySkeleton,
    DebtsSkeleton,
    ExpenseDetailSkeleton,
    ExpensesPageSkeleton,
    GraphsSkeleton,
    LinksSkeleton,
    TripDetailsSkeleton,
    TripsListSkeleton,
    TripsMapSkeleton,
} from 'components/skeleton/trip-skeletons'

import { SlidingToggle } from 'components/sliding-toggle'

import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

const toggleOptions = [
    { value: 'viewer', label: 'Viewer' },
    { value: 'editor', label: 'Editor' },
    { value: 'admin', label: 'Admin' },
]

// Every page skeleton, each in a phone-width frame on the app background —
// compare against the loaded page (other gallery sections or the app).
const Frame = ({ children, height }: { children: React.ReactNode; height?: number }) => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            backgroundColor: colors.secondaryYellow,
            border: `1px dashed ${colors.primaryBlack}40`,
            height,
            overflow: 'hidden',
        }}>
        {children}
    </Box>
)

export default function LoadingGallery() {
    return (
        <GalleryPage title="Loading skeletons">
            <SpecimenGroup title="Trips">
                <Specimen label="trips list"><Frame><TripsListSkeleton /></Frame></Specimen>
                <Specimen label="map"><Frame height={560}><TripsMapSkeleton /></Frame></Specimen>
                <Specimen label="expenses"><Frame><ExpensesPageSkeleton /></Frame></Specimen>
                <Specimen label="expense detail"><Frame><ExpenseDetailSkeleton /></Frame></Specimen>
                <Specimen label="debts"><Frame><DebtsSkeleton /></Frame></Specimen>
                <Specimen label="graphs"><Frame><GraphsSkeleton /></Frame></Specimen>
                <Specimen label="activity"><Frame><ActivitySkeleton /></Frame></Specimen>
                <Specimen label="links"><Frame><LinksSkeleton /></Frame></Specimen>
                <Specimen label="trip details"><Frame><TripDetailsSkeleton /></Frame></Specimen>
                <Specimen label="expense / trip form"><Frame><FormSkeleton /></Frame></Specimen>
            </SpecimenGroup>
            <SpecimenGroup title="Controls">
                <Specimen label="SlidingToggle — loading (first load) then loaded; same height">
                    <Box id="toggle-loading" sx={{ marginBottom: 2 }}>
                        <SlidingToggle loading value="" options={toggleOptions} onChange={() => {}} />
                    </Box>
                    <Box id="toggle-loaded">
                        <SlidingToggle value="editor" options={toggleOptions} onChange={() => {}} />
                    </Box>
                </Specimen>
            </SpecimenGroup>
            <SpecimenGroup title="Health">
                <Specimen label="hub (your section order)"><Frame><HealthHubSkeleton /></Frame></Specimen>
                <Specimen label="workouts"><Frame><WorkoutsListSkeleton /></Frame></Specimen>
                <Specimen label="workout detail"><Frame><WorkoutDetailSkeleton /></Frame></Specimen>
                <Specimen label="workout form"><Frame><WorkoutFormSkeleton /></Frame></Specimen>
                <Specimen label="routines"><Frame><RoutinesSkeleton /></Frame></Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
