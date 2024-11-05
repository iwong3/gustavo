import { Box } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { Gustavo } from 'views/gustavo'
import { Trips } from 'views/trips'

type MainState = {
    showTripsMenu: boolean
}

type MainActions = {
    setShowTripsMenu: (showTripsMenu: boolean) => void
}

const initialState: MainState = {
    showTripsMenu: true,
}

export const useMainStore = create<MainState & MainActions>((set) => ({
    ...initialState,

    setShowTripsMenu: (showTripsMenu) => set({ showTripsMenu }),
}))

export const Main = () => {
    const { showTripsMenu } = useMainStore(useShallow((state) => state))

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
            }}>
            {showTripsMenu ? <Trips /> : <Gustavo />}
        </Box>
    )
}
