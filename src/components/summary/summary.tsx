import { Box } from '@mui/material'

import { TotalSpendByLocation } from 'components/summary/summary-items/total-spend-by-location'
import { TotalSpendByPerson } from 'components/summary/summary-items/total-spend-by-person'
import { TotalSpendByType } from 'components/summary/summary-items/total-spend-by-type'

export const Summary = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}>
            <TotalSpendByPerson />
            <TotalSpendByType />
            <TotalSpendByLocation />
        </Box>
    )
}
