'use client'

import { Box, Typography } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'

import { colors } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import type { UserPreferences } from '@/lib/types'
import { HeaderSlotProvider, HeaderSlotTarget } from 'components/header-slot'
import CategoriesPage from '@/gustavo/settings/categories/page'
import PeoplePage from '@/gustavo/settings/invite/page'
import SettingsPage from '@/gustavo/settings/page'
import type { AllowedEmail } from 'utils/api'

import { categoriesWithMeta } from '../fixtures'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

const PREFS: UserPreferences = {
    defaultTripVisibility: 'participants',
    defaultParticipantRole: 'editor',
    initials: 'IW',
    iconColor: '#fbbc04',
    isAdmin: true,
    alphabetIndexSide: 'right',
}

const GALLERY_CATEGORIES = categoriesWithMeta

const person = (
    id: number,
    email: string,
    createdAt: string,
    joined: { name: string; initials: string | null; color: string | null; at: string } | null
): AllowedEmail => ({
    id,
    email,
    createdAt,
    addedByName: 'Ivan Wong',
    hasAccount: joined !== null,
    userName: joined?.name ?? null,
    userInitials: joined?.initials ?? null,
    userIconColor: joined?.color ?? null,
    joinedAt: joined?.at ?? null,
})
const GALLERY_ALLOWED: AllowedEmail[] = [
    person(6, 'sam.k@gmail.com', '2026-09-27T18:00:00Z', null),
    person(5, 'aunt.mei@gmail.com', '2026-09-20T18:00:00Z', null),
    person(4, 'dan.park@gmail.com', '2026-09-13T18:00:00Z', { name: 'Dan Park', initials: null, color: '#ce93d8', at: '2026-09-14T18:00:00Z' }),
    person(3, 'priya.n@gmail.com', '2026-08-29T18:00:00Z', { name: 'Priya N.', initials: 'PN', color: '#a5d6a7', at: '2026-08-30T18:00:00Z' }),
    person(2, 'marco.r@gmail.com', '2026-08-10T18:00:00Z', { name: 'Marco Rossi', initials: null, color: '#81d4fa', at: '2026-08-12T18:00:00Z' }),
    person(1, 'ivan.w@gmail.com', '2025-06-01T18:00:00Z', { name: 'Ivan Wong', initials: 'IW', color: '#fbbc04', at: '2025-06-01T18:00:00Z' }),
    person(0, 'jenny.l@gmail.com', '2025-07-01T18:00:00Z', { name: 'Jenny', initials: 'JL', color: '#f48fb1', at: '2025-07-02T18:00:00Z' }),
]

/** A throwaway, unpersisted cache seeded with fixtures — the gallery never
 *  writes into the app's real (persisted) query cache. Refetches 401 here
 *  (no session) and keep the seeded data. */
function useFixtureClient() {
    const [client] = useState(() => {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
        qc.setQueryData(queryKeys.users.preferences, PREFS)
        qc.setQueryData(queryKeys.expenseCategories.listWithMeta(), GALLERY_CATEGORIES)
        qc.setQueryData(queryKeys.allowedEmails.list(), GALLERY_ALLOWED)
        return qc
    })
    return client
}

const SESSION = {
    user: { name: 'Ivan Wong', email: 'ivan.w@gmail.com' },
    expires: '2099-01-01T00:00:00.000Z',
}

/** The app header row (Gus / back + the page's title chip via HeaderSlot) over a page body. */
function Screen({ children, back = false }: { children: React.ReactNode; back?: boolean }) {
    return (
        <HeaderSlotProvider>
            <Box sx={{ backgroundColor: colors.secondaryYellow, minHeight: 700, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 56, px: 2, flexShrink: 0 }}>
                    {back ? (
                        <Box sx={{ width: 34, height: 34, border: `1px solid ${colors.primaryBlack}`, borderRadius: '4px', backgroundColor: colors.primaryWhite }} />
                    ) : (
                        <img src="/gus-fring.png" alt="" style={{ width: 36, height: 36, borderRadius: '100%', objectFit: 'cover' }} />
                    )}
                    <HeaderSlotTarget />
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{children}</Box>
            </Box>
        </HeaderSlotProvider>
    )
}

export default function SettingsGallery() {
    const client = useFixtureClient()
    return (
        <SessionProvider session={SESSION} refetchOnWindowFocus={false}>
            <QueryClientProvider client={client}>
                <GalleryPage title="Settings">
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        The Your icon and category forms are in the Forms gallery.
                    </Typography>
                    <SpecimenGroup title="Pages">
                        <Specimen label="settings · admin">
                            <Screen>
                                <SettingsPage />
                            </Screen>
                        </Specimen>
                        <Specimen label="categories · tiles (the + lives in the app shell)">
                            <Screen back>
                                <CategoriesPage />
                            </Screen>
                        </Specimen>
                        <Specimen label="people · newest (swipe a row on touch)">
                            <Screen back>
                                <PeoplePage />
                            </Screen>
                        </Specimen>
                    </SpecimenGroup>
                </GalleryPage>
            </QueryClientProvider>
        </SessionProvider>
    )
}
