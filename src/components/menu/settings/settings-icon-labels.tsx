import { Box, Switch, Typography } from '@mui/material'
import { create } from 'zustand'

type SettingsIconLabelsState = {
    showIconLabels: boolean
}

type SettingsIconLabelsActions = {
    toggleIconLabels: () => void
}

export const useSettingsIconLabelsStore = create<
    SettingsIconLabelsState & SettingsIconLabelsActions
>((set) => ({
    showIconLabels: true,

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
