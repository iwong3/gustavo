'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

import SupplementForm from 'components/health/supplement-form'

const LIST_URL = '/gustavo/health/supplements/manage'

/** New Supplement — /gustavo/health/supplements/manage/new */
export default function AddSupplementPage() {
    const router = useRouter()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <SupplementForm
                mode="add"
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
