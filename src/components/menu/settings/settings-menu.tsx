import { Box } from '@mui/material'

import { SettingsCost } from 'components/menu/settings/settings-cost'
import { SettingsIconLabels } from 'components/menu/settings/settings-icon-labels'
import { SettingsProfilePictures } from 'components/menu/settings/settings-profile-pictures'
import { SettingsSubmitReceipt } from 'components/menu/settings/settings-submit-receipt'
import { SettingsVersion } from 'components/menu/settings/settings-version'

export const SettingsMenu = () => {
    const settingsMenuItems = [
        <SettingsIconLabels />,
        <SettingsProfilePictures />,
        <SettingsCost />,
        <SettingsSubmitReceipt />,
        <SettingsVersion />,
    ]

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                marginX: 2,
                border: '1px solid #FFFFEF',
                borderBottomWidth: 0,
            }}>
            {settingsMenuItems.map((item, index) => (
                <Box
                    key={'settings-menu-item-' + index}
                    sx={{
                        marginTop: index === 0 ? 0 : 1,
                        marginBottom:
                            index === settingsMenuItems.length - 1 ? 0 : 1,
                    }}>
                    {item}
                </Box>
            ))}
        </Box>
    )
}
