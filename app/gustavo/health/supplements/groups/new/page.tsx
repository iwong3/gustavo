'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

import SupplementGroupForm from 'components/health/supplement-group-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useSupplementData } from 'hooks/useSupplementData'

const LIST_URL = '/gustavo/health/supplements/groups'

/** New Supplement Group — /gustavo/health/supplements/groups/new */
export default function AddSupplementGroupPage() {
    const router = useRouter()
    const { supplements, loading } = useSupplementData()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <SupplementGroupForm
                mode="add"
                supplements={supplements}
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
