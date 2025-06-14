import { Box, Typography } from '@mui/material'
import { create } from 'zustand'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { defaultBackgroundColor } from 'utils/colors'
import { getTablerIcon } from 'utils/icons'
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

export const useCollapseAllStore = create<
    CollapseAllState & CollapseAllActions
>((set) => ({
    ...initialState,

    toggle: () => {
        set((state) => ({
            value: !state.value,
        }))
    },
}))

export const CollapseAll = () => {
    const { toggle } = useCollapseAllStore(useShallow((state) => state))
    const { showIconLabels } = useSettingsIconLabelsStore(
        useShallow((state) => state)
    )

    const iconBoxWidth = 24
    const iconBoxMaxWidth = 74

    return (
        <Box
            onClick={() => {
                toggle()
                document
                    .getElementById('receipts-list')
                    ?.scrollIntoView({ behavior: 'smooth' })
            }}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'paddingX': 0.5,
                'width': showIconLabels ? iconBoxMaxWidth : iconBoxWidth,
                'height': 30,
                'border': '1px solid #FBBC04',
                'borderRadius': '10px',
                'backgroundColor': defaultBackgroundColor,
                '&:active': {
                    backgroundColor: '#FAEDCD',
                },
                'transition': 'background-color 0.1s, width 0.1s ease-out',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: iconBoxWidth,
                    height: iconBoxWidth,
                }}>
                {getTablerIcon({ name: 'IconLayoutNavbarCollapse', size: 20 })}
            </Box>
            <Box
                sx={{
                    maxWidth: showIconLabels ? iconBoxMaxWidth : 0,
                    overflow: 'hidden',
                }}>
                <Typography
                    sx={{
                        marginLeft: 0.25,
                        fontSize: 12,
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                    }}>
                    Collapse
                </Typography>
            </Box>
        </Box>
    )
}
