'use client'

import { Box } from '@mui/material'

import SupplementForm from 'components/health/supplement-form'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/supplements/manage'

/** New Supplement — /gustavo/health/supplements/manage/new */
export default function AddSupplementPage() {
    const exitTo = useExitTo()

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
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
