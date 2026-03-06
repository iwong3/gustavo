import { Box, Link } from '@mui/material'
import { usePathname } from 'next/navigation'

import { UrlsByTripSlug } from 'utils/data-mapping'
import { getTablerIcon } from 'utils/icons'

export const SettingsSubmitReceipt = () => {
    const pathname = usePathname()
    const slug = pathname.split('/').pop() ?? ''
    const urls = UrlsByTripSlug[slug]

    return (
        <Link
            href={urls?.GoogleFormUrl ?? '#'}
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
