'use client'

import { Box } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'

import { colors } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import type { ExpenseCategoryWithMeta, UserPreferences } from '@/lib/types'
import { HeaderSlotProvider, HeaderSlotTarget } from 'components/header-slot'
import { IconForm } from 'components/settings/icon-form'
import SettingsPage from '@/gustavo/settings/page'
import type { AllowedEmail } from 'utils/api'

import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

const noop = () => {}

const PREFS: UserPreferences = {
    defaultTripVisibility: 'participants',
    defaultParticipantRole: 'editor',
    initials: 'IW',
    iconColor: '#fbbc04',
    isAdmin: true,
    alphabetIndexSide: 'right',
}

const cat = (id: number, name: string, usageCount: number, slug: string | null = null): ExpenseCategoryWithMeta => ({
    id,
    name,
    slug,
    updatedAt: '2026-09-01T00:00:00.000Z',
    usageCount,
    canEdit: !slug,
})
const GALLERY_CATEGORIES: ExpenseCategoryWithMeta[] = [
    cat(1, 'Food', 223),
    cat(2, 'Shopping', 205),
    cat(3, 'Transit', 109),
    cat(4, 'Attraction', 28),
    cat(5, 'Lodging', 25),
    cat(6, 'Other', 5),
    cat(7, 'Currency Exchange', 1, 'currency_exchange'),
]

const person = (id: number, email: string, createdAt: string, userName: string | null): AllowedEmail => ({
    id,
    email,
    createdAt,
    addedByName: 'Ivan Wong',
    hasAccount: userName !== null,
    userName,
})
const GALLERY_ALLOWED: AllowedEmail[] = [
    person(6, 'sam.k@gmail.com', '2026-09-27T18:00:00Z', null),
    person(5, 'aunt.mei@gmail.com', '2026-09-20T18:00:00Z', null),
    person(4, 'dan.park@gmail.com', '2026-09-14T18:00:00Z', 'Dan Park'),
    person(3, 'priya.n@gmail.com', '2026-08-30T18:00:00Z', 'Priya N.'),
    person(2, 'marco.r@gmail.com', '2026-08-12T18:00:00Z', 'Marco Rossi'),
    person(1, 'jenny.l@gmail.com', '2025-07-02T18:00:00Z', 'Jenny'),
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
                    <SpecimenGroup title="Settings + Your icon">
                        <Specimen label="settings · admin">
                            <Screen>
                                <SettingsPage />
                            </Screen>
                        </Specimen>
                        <Specimen label="your icon (form)">
                            <Screen back>
                                <Box sx={{ width: '100%' }}>
                                    <IconForm
                                        name="Ivan Wong"
                                        initials="IW"
                                        iconColor="#fbbc04"
                                        onCancel={noop}
                                        onSave={async () => {}}
                                    />
                                </Box>
                            </Screen>
                        </Specimen>
                    </SpecimenGroup>
                </GalleryPage>
            </QueryClientProvider>
        </SessionProvider>
    )
}
