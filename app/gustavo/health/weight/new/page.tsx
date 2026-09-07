'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

import WeightForm from 'components/health/weight-form'

const LIST_URL = '/gustavo/health/weight'

/** Log Weight — /gustavo/health/weight/new */
export default function AddWeightPage() {
    const router = useRouter()

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
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
