import { Box, Typography } from '@mui/material'
import { HandCoins } from '@phosphor-icons/react/dist/ssr'
import { create } from 'zustand'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { resetAllToolsMenuStores } from 'components/menu/tools/tools-menu'
import { useShallow } from 'zustand/react/shallow'

type ToolsMenuDebtState = {
    active: boolean
}

type ToolsMenuDebtActions = {
    isActive: () => boolean

    toggleActive: () => void
    reset: () => void
}

const initialState: ToolsMenuDebtState = {
    active: false,
}

export const useToolsMenuDebtStore = create<ToolsMenuDebtState & ToolsMenuDebtActions>(
    (set, get) => ({
        ...initialState,

        isActive: () => {
            const { active } = get()
            return active
        },

        toggleActive: () => {
            const { active } = get()
            const save = active
            resetAllToolsMenuStores()
            set(() => ({
                active: !save,
            }))
        },
        reset: () => {
            set(initialState)
        },
    })
)

export const ToolsMenuDebt = () => {
    const { active, toggleActive } = useToolsMenuDebtStore(useShallow((state) => state))

    // settings stores
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
            onClick={() => {
                toggleActive()
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '100%',
                    backgroundColor: active ? '#FBBC04' : 'white',
                    transition: 'background-color 0.1s',
                }}>
                {<HandCoins size={24} />}
            </Box>
            {showIconLabels && <Typography sx={{ fontSize: '10px' }}>Debt</Typography>}
        </Box>
    )
}
