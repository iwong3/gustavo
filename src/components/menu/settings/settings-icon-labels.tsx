import { Box, Switch, Typography } from '@mui/material'
import { create } from 'zustand'

import { getTablerIcon } from 'helpers/icons'

type SettingsIconLabelsState = {
    showIconLabels: boolean
}

type SettingsIconLabelsActions = {
    toggleIconLabels: () => void
}

export const useSettingsIconLabelsStore = create<
    SettingsIconLabelsState & SettingsIconLabelsActions
>((set) => ({
    showIconLabels: false,

    toggleIconLabels: () =>
        set((state) => ({
            showIconLabels: !state.showIconLabels,
        })),
}))

export const SettingsIconLabels = () => {
    const { showIconLabels, toggleIconLabels } = useSettingsIconLabelsStore()

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
            {/* {getTablerIcon({ name: 'IconTextSize' })} */}
            <Typography
                sx={{
                    marginRight: 2,
                    fontSize: '14px',
                }}>
                Show Labels
            </Typography>
            <Box
                onClick={() => {
                    toggleIconLabels()
                }}>
                <Switch checked={showIconLabels} size={'small'} />
            </Box>
        </Box>
    )
}
