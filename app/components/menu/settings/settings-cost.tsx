import { Box, Switch, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { getFromCache, saveInCache } from 'utils/cache'
import { CostDisplay } from 'utils/currency'

const CONVERT_TO_USD_CACHE_KEY = 'convertToUSD'

type SettingsCostState = {
    costDisplay: CostDisplay
}

type SettingsCostActions = {
    toggleCostDisplay: () => void
}

export const useSettingsCostStore = create<
    SettingsCostState & SettingsCostActions
>((set, get) => ({
    costDisplay: parseInt(
        getFromCache(CONVERT_TO_USD_CACHE_KEY, CostDisplay.Original.toString())
    ),

    toggleCostDisplay: () => {
        const { costDisplay } = get()
        const newValue =
            costDisplay === CostDisplay.Original
                ? CostDisplay.Converted
                : CostDisplay.Original
        set(() => ({
            costDisplay: newValue,
        }))
        saveInCache(CONVERT_TO_USD_CACHE_KEY, newValue.toString())
    },
}))

export const SettingsCost = () => {
    const { costDisplay, toggleCostDisplay } = useSettingsCostStore(
        useShallow((state) => state)
    )

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
                Convert to USD
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onClick={() => {
                    toggleCostDisplay()
                }}>
                <Switch
                    checked={costDisplay === CostDisplay.Converted}
                    size={'small'}
                />
            </Box>
        </Box>
    )
}
