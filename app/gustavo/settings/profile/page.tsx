'use client'

import { Box } from '@mui/material'
import { useSession } from 'next-auth/react'

import { FormSkeleton } from 'components/skeleton/form-skeleton'
import { IconForm } from 'components/settings/icon-form'
import { useExitTo } from 'hooks/use-exit-to'
import { useUserPreferences } from 'hooks/useUserPreferences'

const BACK_URL = '/gustavo/settings'

/** Your icon — initials + colour (Settings → tap your avatar). */
export default function ProfileIconPage() {
    const exitTo = useExitTo()
    const { data: session } = useSession()
    const { prefs, updateAsync } = useUserPreferences()

    // The form seeds its fields once, so wait for the saved values
    if (!prefs) return <FormSkeleton fields={['field', 'field']} />

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 450 }}>
            <IconForm
                name={session?.user?.name ?? ''}
                initials={prefs.initials}
                iconColor={prefs.iconColor}
                onCancel={() => exitTo(BACK_URL)}
                onSave={async (initials, iconColor) => {
                    await updateAsync({ initials, iconColor })
                    exitTo(BACK_URL)
                }}
            />
        </Box>
    )
}
