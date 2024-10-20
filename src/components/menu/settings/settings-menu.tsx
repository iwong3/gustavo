import { Box } from '@mui/material'

import { SettingsCost } from 'components/menu/settings/settings-cost'
import { SettingsIconLabels } from 'components/menu/settings/settings-icon-labels'
import { SettingsSubmitReceipt } from 'components/menu/settings/settings-submit-receipt'

export const SettingsMenu = () => {
    const settingsMenuItems = [<SettingsIconLabels />, <SettingsCost />, <SettingsSubmitReceipt />]

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
                        marginBottom: index === settingsMenuItems.length - 1 ? 0 : 1,
                    }}>
                    {item}
                </Box>
            ))}
        </Box>
    )
}
