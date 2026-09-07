'use client'

import { Box, Typography } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'

import SupplementForm from 'components/health/supplement-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useSupplementData } from 'hooks/useSupplementData'

const LIST_URL = '/gustavo/health/supplements/manage'

/** Edit Supplement — /gustavo/health/supplements/manage/[id]/edit */
export default function EditSupplementPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { supplements, loading } = useSupplementData()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    // Compare as strings: ids are BIGINTs and arrive as strings at runtime
    const supplement = supplements.find((s) => String(s.id) === id)
    if (!supplement) {
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
                    This supplement no longer exists.
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
            <SupplementForm
                key={String(supplement.id)}
                mode="edit"
                supplement={supplement}
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
