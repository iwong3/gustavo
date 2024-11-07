import { Box, Link } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { UrlsByTrip, ViewPath } from 'helpers/data-mapping'
import { getTablerIcon } from 'helpers/icons'
import { useTripsStore } from 'views/trips'

export const SettingsViewData = () => {
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    return (
        <Link
            href={UrlsByTrip.get(currentTrip)!.GoogleSheetUrl + ViewPath}
            target="_blank"
            color="inherit"
            underline="none">
            <Box
                sx={{
                    display: 'flex',
                }}>
                <Box>View Data</Box>
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
