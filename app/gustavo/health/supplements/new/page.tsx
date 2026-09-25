'use client'

import { Box } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import SupplementLogForm from 'components/health/supplement-log-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useSupplementData } from 'hooks/useSupplementData'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/supplements'
const MANAGE_URL = `${LIST_URL}/manage`

/**
 * Log Supplements. `?date=<YYYY-MM-DD>` opens that day for editing (the day
 * is the record — saving diffs against its existing logs).
 */
function LogSupplementsPage() {
    const router = useRouter()
    const exitTo = useExitTo()
    const searchParams = useSearchParams()
    const { supplements, logs, loading } = useSupplementData()

    const date = searchParams.get('date')

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <SupplementLogForm
                key={date ?? 'new'}
                mode={date ? 'edit' : 'add'}
                initialDate={date ?? undefined}
                supplements={supplements}
                allLogs={logs}
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
                onAddSupplements={() => router.push(MANAGE_URL)}
            />
        </Box>
    )
}

export default function Page() {
    // useSearchParams needs a Suspense boundary
    return (
        <Suspense
            fallback={<HealthPageLayout loading>{null}</HealthPageLayout>}>
            <LogSupplementsPage />
        </Suspense>
    )
}
