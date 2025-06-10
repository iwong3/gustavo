import { Box, Switch, Typography } from '@mui/material'
import { create } from 'zustand'

import { getFromCache, saveInCache } from 'utils/cache'

const SHOW_ICON_LABELS_CACHE_KEY = 'showIconLabels'

type SettingsIconLabelsState = {
    showIconLabels: boolean
}

type SettingsIconLabelsActions = {
    toggleIconLabels: () => void
}

export const useSettingsIconLabelsStore = create<
    SettingsIconLabelsState & SettingsIconLabelsActions
>((set, get) => ({
    showIconLabels: getFromCache(SHOW_ICON_LABELS_CACHE_KEY, 'true') === 'true',

    toggleIconLabels: () => {
        const { showIconLabels } = get()
        const newValue = !showIconLabels
        set(() => ({
            showIconLabels: newValue,
        }))
        saveInCache(SHOW_ICON_LABELS_CACHE_KEY, newValue.toString())
    },
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
