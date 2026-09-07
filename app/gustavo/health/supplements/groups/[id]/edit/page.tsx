'use client'

import { Box, Typography } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'

import SupplementGroupForm from 'components/health/supplement-group-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useSupplementData } from 'hooks/useSupplementData'

const LIST_URL = '/gustavo/health/supplements/groups'

/** Edit Supplement Group — /gustavo/health/supplements/groups/[id]/edit */
export default function EditSupplementGroupPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { supplements, presets, loading } = useSupplementData()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    // Compare as strings: ids are BIGINTs and arrive as strings at runtime
    const preset = presets.find((p) => String(p.id) === id)
    if (!preset) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: 450,
                    padding: 4,
                }}>
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    This group no longer exists.
                </Typography>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <SupplementGroupForm
                key={String(preset.id)}
                mode="edit"
                preset={preset}
                supplements={supplements}
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
