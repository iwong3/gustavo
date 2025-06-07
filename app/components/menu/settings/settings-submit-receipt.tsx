import { Box, Link } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { UrlsByTrip } from 'utils/data-mapping'
import { getTablerIcon } from 'utils/icons'
import { useTripsStore } from 'views/trips'

export const SettingsSubmitReceipt = () => {
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    return (
        <Link
            href={UrlsByTrip.get(currentTrip)!.GoogleFormUrl}
            target="_blank"
            color="inherit"
            underline="none">
            <Box
                sx={{
                    display: 'flex',
                }}>
                <Box>Submit Receipt</Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'top',
                        marginLeft: 0.25,
                    }}>
                    {getTablerIcon({ name: 'IconExternalLink', size: 12 })}
                </Box>
            </Box>
        </Link>
    )
}
