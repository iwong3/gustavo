import { Box, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { ToolsMenu } from 'components/menu/tools/tools-menu'
import { clearFromCache } from 'helpers/cache'
import { getTablerIcon } from 'helpers/icons'
import { Gustavo, useGustavoStore } from 'views/gustavo'
import { Trips, useTripsStore } from 'views/trips'
import GusFringLogo from '../images/gus-fring.png'

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
    const { showTripsMenu, setShowTripsMenu } = useMainStore(
        useShallow((state) => state)
    )
    const { currentTrip, isLoading } = useTripsStore(
        useShallow((state) => state)
    )
    const { error } = useGustavoStore(useShallow((state) => state))

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                maxWidth: 450,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    position: 'fixed',
                    top: 0,
                    backgroundColor: '#F4D35E',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                        marginTop: 2,
                        marginLeft: 2,
                        marginRight: 1,
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                        }}>
                        <Box
                            onClick={() => {
                                setShowTripsMenu(true)
                                clearFromCache('currentTrip')
                            }}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            <img
                                src={GusFringLogo}
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        </Box>
                        {!isLoading && showTripsMenu ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    marginLeft: 2,
                                }}>
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        fontFamily: 'Spectral',
                                        lineHeight: '90%',
                                    }}>
                                    "And a man, a man provides...
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        fontFamily: 'Spectral',
                                        lineHeight: '90%',
                                    }}>
                                    &nbsp; ...your spending habits."
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    marginLeft: 2,
                                }}>
                                {error && (
                                    <Box
                                        sx={{
                                            marginRight: 1,
                                        }}>
                                        {getTablerIcon({
                                            name: 'IconExclamationCircle',
                                            fill: '#D00000',
                                            color: '#F4D35E',
                                            size: 24,
                                        })}
                                    </Box>
                                )}
                                <Typography
                                    sx={{
                                        fontSize: 18,
                                    }}>
                                    {!isLoading && currentTrip}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    {!showTripsMenu && <ToolsMenu />}
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    marginTop: '17%',
                    marginBottom: 1,
                }}>
                {showTripsMenu ? <Trips /> : <Gustavo />}
            </Box>
        </Box>
    )
}
