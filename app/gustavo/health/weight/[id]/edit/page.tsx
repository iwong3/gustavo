'use client'

import { Box, Typography } from '@mui/material'
import { useParams } from 'next/navigation'

import WeightForm from 'components/health/weight-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useWeightLogs } from 'hooks/useWeightLogs'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/weight'

/** Edit Weight — /gustavo/health/weight/[id]/edit */
export default function EditWeightPage() {
    const { id } = useParams<{ id: string }>()
    const exitTo = useExitTo()
    const { logs, loading } = useWeightLogs()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    // Compare as strings: ids are BIGINTs and arrive as strings at runtime
    const log = logs.find((l) => String(l.id) === id)
    if (!log) {
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
                    This weight entry no longer exists.
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
            <WeightForm
                key={String(log.id)}
                mode="edit"
                log={log}
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
