import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
import { CostDisplay } from 'helpers/currency'
import { getTablerIcon } from 'icons/tabler-icons'
import { create } from 'zustand'

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
                justifyContent: 'center',
                alignItems: 'center',
                marginX: 2,
            }}>
            {getTablerIcon({ name: 'IconCurrencyDollar' })}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onClick={() => {
                    toggleCostDisplay()
                }}>
                <Switch checked={costDisplay === CostDisplay.Converted} />
            </Box>
        </Box>
    )
}
