import { Box, Switch, Typography } from '@mui/material'
import { create } from 'zustand'

import { getFromCache, saveInCache } from 'helpers/cache'
import { useShallow } from 'zustand/react/shallow'

const SHOW_PROFILE_PICTURES_CACHE_KEY = 'showProfilePictures'

type SettingsProfilePicturesState = {
    showProfilePictures: boolean
}

type SettingsProfilePicturesActions = {
    toggleProfilePictures: () => void
}

export const useSettingsProfilePicturesStore = create<
    SettingsProfilePicturesState & SettingsProfilePicturesActions
>((set, get) => ({
    showProfilePictures:
        getFromCache(SHOW_PROFILE_PICTURES_CACHE_KEY, 'true') === 'true',

    toggleProfilePictures: () => {
        const { showProfilePictures } = get()
        const newValue = !showProfilePictures
        set(() => ({
            showProfilePictures: newValue,
        }))
        saveInCache(SHOW_PROFILE_PICTURES_CACHE_KEY, newValue.toString())
    },
}))

export const SettingsProfilePictures = () => {
    const { showProfilePictures, toggleProfilePictures } =
        useSettingsProfilePicturesStore(useShallow((state) => state))

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
                Profile Pictures
            </Typography>
            <Box
                onClick={() => {
                    toggleProfilePictures()
                }}>
                <Switch checked={showProfilePictures} size={'small'} />
            </Box>
        </Box>
    )
}
