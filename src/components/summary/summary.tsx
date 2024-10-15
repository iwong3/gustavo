import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { TotalSpend } from 'components/summary/summary-items/total-spend'
import { useSummaryViewMenuStore } from 'components/menu/items/summary-view-menu'

export const Summary = () => {
    const { activeComponent } = useSummaryViewMenuStore(useShallow((state) => state))

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    margin: 1,
                    marginTop: 0,
                }}>
                <TotalSpend />
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                {activeComponent}
            </Box>
        </Box>
    )
}
