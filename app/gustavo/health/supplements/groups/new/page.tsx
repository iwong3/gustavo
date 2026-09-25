'use client'

import { Box } from '@mui/material'

import SupplementGroupForm from 'components/health/supplement-group-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useSupplementData } from 'hooks/useSupplementData'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/supplements/groups'

/** New Supplement Group — /gustavo/health/supplements/groups/new */
export default function AddSupplementGroupPage() {
    const exitTo = useExitTo()
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
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
