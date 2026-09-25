'use client'

import { Box } from '@mui/material'

import WeightForm from 'components/health/weight-form'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/weight'

/** Log Weight — /gustavo/health/weight/new */
export default function AddWeightPage() {
    const exitTo = useExitTo()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <WeightForm
                mode="add"
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
