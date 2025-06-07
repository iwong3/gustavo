import { Box, Tooltip, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { ToolsMenu } from 'components/menu/tools/tools-menu'
import { clearFromCache } from 'utils/cache'
import { ErrorConvertingToUSDGeneral } from 'utils/data-processing'
import { getTablerIcon } from 'utils/icons'
import { Gustavo } from 'views/gustavo'
import { Trips, useTripsStore } from 'views/trips'
// import GusFringLogo from '../images/gus-fring.png'

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
    const { currentTrip, loading, fetchDataError, currencyConversionError } =
        useTripsStore(useShallow((state) => state))

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
                            {/* <img
                                src={GusFringLogo}
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '100%',
                                    objectFit: 'cover',
                                }}
                            /> */}
                        </Box>
                        {!loading && showTripsMenu ? (
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
                                    &quot;And a man, a man provides...
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        fontFamily: 'Spectral',
                                        lineHeight: '90%',
                                    }}>
                                    &nbsp; ...your spending habits.&quot;
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    marginLeft: 2,
                                }}>
                                {currencyConversionError && (
                                    <Tooltip
                                        title={ErrorConvertingToUSDGeneral}
                                        enterTouchDelay={0}
                                        slotProps={{
                                            popper: {
                                                modifiers: [
                                                    {
                                                        name: 'offset',
                                                        options: {
                                                            offset: [0, -12],
                                                        },
                                                    },
                                                ],
                                            },
                                            tooltip: {
                                                sx: {
                                                    padding: 1,
                                                    border: '1px solid #C1121F',
                                                    fontSize: 12,
                                                    color: 'black',
                                                    fontStyle: 'italic',
                                                    fontWeight: 600,
                                                    backgroundColor: '#f4d35e',
                                                    boxShadow:
                                                        'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                                                },
                                            },
                                        }}>
                                        <Box
                                            sx={{
                                                marginRight: 1,
                                            }}>
                                            {getTablerIcon({
                                                name: 'IconExclamationCircle',
                                                fill: '#C1121F',
                                                color: '#F4D35E',
                                                size: 24,
                                            })}
                                        </Box>
                                    </Tooltip>
                                )}
                                <Typography
                                    onClick={() => {
                                        setShowTripsMenu(true)
                                        clearFromCache('currentTrip')
                                    }}
                                    sx={{
                                        fontSize: 18,
                                    }}>
                                    {!loading && currentTrip}
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
                {!fetchDataError && (showTripsMenu ? <Trips /> : <Gustavo />)}
                {fetchDataError && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            margin: 5,
                            width: '100%',
                            border: '1px solid #C1121F',
                            borderRadius: '10px',
                            backgroundColor: '#FFFCEE',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingY: 4,
                                borderTopLeftRadius: '10px',
                                borderTopRightRadius: '10px',
                                backgroundColor: '#f4978e',
                            }}>
                            {getTablerIcon({
                                name: 'IconExclamationCircle',
                                fill: '#f4978e',
                                color: '#FFFCEE',
                                size: 42,
                            })}
                            {/* <Typography
                                sx={{
                                    marginTop: 1,
                                    fontSize: 20,
                                    color: '#FFFCEE',
                                }}>
                                Error
                            </Typography> */}
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: 2,
                                borderBottomLeftRadius: '10px',
                                borderBottomRightRadius: '10px',
                                backgroundColor: '#FFFCEE',
                                fontSize: 16,
                                textAlign: 'center',
                            }}>
                            There was an error fetching data from Google Sheets.
                            Please refresh to try again.
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
