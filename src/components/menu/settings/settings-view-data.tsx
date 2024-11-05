import { Box, Link } from '@mui/material'

import { GOOGLE_SHEET_VIEW_ONLY_URL } from 'helpers/data-mapping'
import { getTablerIcon } from 'helpers/icons'

export const SettingsViewData = () => {
    return (
        <Link href={GOOGLE_SHEET_VIEW_ONLY_URL} target="_blank" color="inherit" underline="none">
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
