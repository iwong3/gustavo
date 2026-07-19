'use client'

import { Box } from '@mui/material'

import { colors } from '@/lib/colors'
import type { TripSummary } from '@/lib/types'
import { NavDrawerContent } from 'components/nav-drawer'

import { makePassTrip } from '../fixtures'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

const user = { name: 'Ivan Wong', email: 'ivanwong15@gmail.com', image: null }

// Far-future / far-past dates so specimens don't drift between the
// upcoming/past buckets as real time passes
const upcoming: TripSummary[] = [
    makePassTrip({ name: 'Japan 2027', slug: 'japan-2027', startDate: '2027-08-04', endDate: '2027-08-18' }),
    makePassTrip({ name: 'Portugal Autumn', slug: 'portugal-autumn', startDate: '2027-10-02', endDate: '2027-10-09' }),
]

const past: TripSummary[] = [
    makePassTrip({ name: 'Iceland Spring', slug: 'iceland-spring', startDate: '2025-04-10', endDate: '2025-04-18' }),
    makePassTrip({ name: 'NYC Weekend', slug: 'nyc-weekend', startDate: '2025-02-14', endDate: '2025-02-16' }),
    makePassTrip({ name: 'Mexico City', slug: 'mexico-city', startDate: '2024-11-01', endDate: '2024-11-08' }),
    makePassTrip({ name: 'Korea 2024', slug: 'korea-2024', startDate: '2024-05-03', endDate: '2024-05-17' }),
    makePassTrip({ name: 'A Very Long Trip Name That Should Truncate', slug: 'long-name-trip', startDate: '2024-03-01', endDate: '2024-03-05' }),
]

const trips = [...upcoming, ...past]

/** Fixed-height drawer frame — replicates the Drawer paper (flex column) */
function DrawerFrame({ children, height = 620 }: { children: React.ReactNode; height?: number }) {
    return (
        <Box
            sx={{
                width: 272,
                height,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backgroundColor: colors.secondaryYellow,
                border: `1px solid ${colors.primaryBlack}`,
            }}>
            {children}
        </Box>
    )
}

const noop = () => {}

export default function NavDrawerGallery() {
    return (
        <GalleryPage title="Nav drawer">
            <SpecimenGroup title="Structure — Settings, Log out row, identity footer, demoted Gallery">
                <Specimen label="on Home (short list; spacer pins Gallery to the bottom)">
                    <DrawerFrame height={680}>
                        <NavDrawerContent
                            trips={trips}
                            loading={false}
                            pathname="/gustavo"
                            user={user}
                            onClose={noop}
                        />
                    </DrawerFrame>
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Auto-expand — the drawer opens as a 'you are here' map">
                <Specimen label="on an expense detail (Japan unfolds, Expenses banded)">
                    <DrawerFrame>
                        <NavDrawerContent
                            trips={trips}
                            loading={false}
                            pathname="/gustavo/trips/japan-2027/expenses/42"
                            user={user}
                            onClose={noop}
                        />
                    </DrawerFrame>
                </Specimen>
                <Specimen label="on Health › Diet (health unfolds, Diet banded)">
                    <DrawerFrame>
                        <NavDrawerContent
                            trips={trips}
                            loading={false}
                            pathname="/gustavo/health/diet"
                            user={user}
                            onClose={noop}
                        />
                    </DrawerFrame>
                </Specimen>
                <Specimen label="on the trips list (top-level band)">
                    <DrawerFrame>
                        <NavDrawerContent
                            trips={trips}
                            loading={false}
                            pathname="/gustavo/trips"
                            user={user}
                            onClose={noop}
                        />
                    </DrawerFrame>
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Scroll behavior — footer pinned, edge fades when content overflows">
                <Specimen label="on a past trip, short frame (past auto-expands; scroll to see fades)">
                    <DrawerFrame height={420}>
                        <NavDrawerContent
                            trips={trips}
                            loading={false}
                            pathname="/gustavo/trips/mexico-city/debts"
                            user={user}
                            onClose={noop}
                        />
                    </DrawerFrame>
                </Specimen>
                <Specimen label="loading trips">
                    <DrawerFrame height={420}>
                        <NavDrawerContent
                            trips={[]}
                            loading={true}
                            pathname="/gustavo"
                            user={user}
                            onClose={noop}
                        />
                    </DrawerFrame>
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
