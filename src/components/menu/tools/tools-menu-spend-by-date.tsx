import { Box, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { resetAllToolsMenuStores } from 'components/menu/tools/tools-menu'
import { getTablerIcon } from 'helpers/icons'

type ToolsMenuSpendByDateState = {
    active: boolean
}

type ToolsMenuSpendByDateActions = {
    isActive: () => boolean

    toggleActive: () => void
    reset: () => void
}

const initialState: ToolsMenuSpendByDateState = {
    active: false,
}

export const useToolsMenuSpendByDateStore = create<
    ToolsMenuSpendByDateState & ToolsMenuSpendByDateActions
>((set, get) => ({
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
}))

export const ToolsMenuSpendByDate = () => {
    const { active, toggleActive } = useToolsMenuSpendByDateStore(useShallow((state) => state))

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
                {getTablerIcon({ name: 'IconCalendarEvent' })}
            </Box>
            {showIconLabels && <Typography sx={{ fontSize: '10px' }}>Spend By Date</Typography>}
        </Box>
    )
}
