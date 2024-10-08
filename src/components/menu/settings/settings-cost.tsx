import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
import { create } from 'zustand'

import { CostDisplay } from 'helpers/currency'
import { getTablerIcon } from 'helpers/icons'
import { Typography } from '@mui/material'

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
    const { costDisplay, toggleCostDisplay } = useSettingsCostStore()

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
            {/* {getTablerIcon({ name: 'IconCurrencyDollar' })} */}
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
