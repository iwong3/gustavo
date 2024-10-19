import { Box, Link } from '@mui/material'

import { GOOGLE_FORM_URL } from 'helpers/data-mapping'
import { getTablerIcon } from 'helpers/icons'

export const SettingsSubmitReceipt = () => {
    return (
        <Link href={GOOGLE_FORM_URL} target="_blank" color="inherit" underline="none">
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
