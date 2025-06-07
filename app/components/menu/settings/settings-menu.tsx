import { Box } from '@mui/material'

import { SettingsCost } from 'components/menu/settings/settings-cost'
import { SettingsIconLabels } from 'components/menu/settings/settings-icon-labels'
import { SettingsSubmitReceipt } from 'components/menu/settings/settings-submit-receipt'
import { SettingsVersion } from 'components/menu/settings/settings-version'

export const SettingsMenu = () => {
    const settingsMenuItems = [
        <SettingsIconLabels />,
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
