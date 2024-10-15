import { Box } from '@mui/material'
import { create } from 'zustand'

import { getTablerIcon } from 'helpers/icons'
import { useShallow } from 'zustand/react/shallow'

type CollapseAllState = {
    value: boolean
}

type CollapseAllActions = {
    toggle: () => void
}

const initialState: CollapseAllState = {
    value: false,
}

export const useCollapseAllStore = create<CollapseAllState & CollapseAllActions>((set) => ({
    ...initialState,

    toggle: () => {
        set((state) => ({
            value: !state.value,
        }))
    },
}))

export const CollapseAll = () => {
    const { toggle } = useCollapseAllStore(useShallow((state) => state))

    return (
        <Box
            onClick={toggle}
            sx={{
                'display': 'flex',
                'justifyContent': 'center',
                'alignItems': 'center',
                'padding': 0.5,
                'marginLeft': 1,
                'border': '2px solid #FBBC04',
                'borderRadius': '10px',
                'backgroundColor': 'white',
                '&:active': {
                    backgroundColor: '#FBBC04',
                },
                'transition': 'background-color 0.1s',
            }}>
            {getTablerIcon({ name: 'IconLayoutNavbarCollapse' })}
        </Box>
    )
}
