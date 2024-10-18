import { Box, Switch, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { CostDisplay } from 'helpers/currency'

type SettingsCostState = {
    costDisplay: CostDisplay
}

type SettingsCostActions = {
    toggleCostDisplay: () => void
}

export const useSettingsCostStore = create<SettingsCostState & SettingsCostActions>((set) => ({
    costDisplay: CostDisplay.Original,

    toggleCostDisplay: () =>
        set((state) => ({
            costDisplay:
                state.costDisplay === CostDisplay.Original
                    ? CostDisplay.Converted
                    : CostDisplay.Original,
        })),
}))

export const SettingsCost = () => {
    const { costDisplay, toggleCostDisplay } = useSettingsCostStore(useShallow((state) => state))

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
                <Switch checked={costDisplay === CostDisplay.Converted} size={'small'} />
            </Box>
        </Box>
    )
}
