import { Box, Link } from '@mui/material'

import { SettingsCost } from 'components/menu/settings/settings-cost'
import { SettingsIconLabels } from 'components/menu/settings/settings-icon-labels'
import { GOOGLE_FORM_URL } from 'helpers/data-mapping'
import { getTablerIcon } from 'helpers/icons'

export const SettingsMenu = () => {
    const settingsMenuItems = [<SettingsIconLabels />, <SettingsCost />]

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                marginX: 2,
                border: '1px solid white',
                borderBottomWidth: 0,
            }}>
            {settingsMenuItems.map((item, index) => (
                <Box
                    key={'settings-menu-item-' + index}
                    sx={{
                        marginTop: index === 0 ? 0 : 1,
                        marginBottom: 1,
                    }}>
                    {item}
                </Box>
            ))}
            <Box sx={{ marginTop: 1, fontSize: '14px' }}>
                <Link href={GOOGLE_FORM_URL} target="_blank" color="inherit" underline="none">
                    <Box
                        sx={{
                            display: 'flex',
                        }}>
                        <Box>Submit spend</Box>
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
            </Box>
        </Box>
    )
}
