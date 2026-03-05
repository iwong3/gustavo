'use client'

import { Box, Tooltip, Typography } from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'

import { ToolsMenu } from 'components/menu/tools/tools-menu'
import { clearFromCache } from 'utils/cache'
import { ErrorConvertingToUSDGeneral } from 'utils/data-processing'
import { getTablerIcon } from 'utils/icons'
import { useTripsStore } from 'views/trips'

export default function GustavoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const { currentTrip, loading, currencyConversionError } = useTripsStore(
        useShallow((state) => state)
    )

    const isTripsPage = pathname === '/gustavo/trips'

    const handleBackToTrips = () => {
        clearFromCache('currentTrip')
        router.push('/gustavo/trips')
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
            }}>
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
                        maxWidth: 450,
                        backgroundColor: '#F4D35E',
                        zIndex: 10,
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
                                onClick={handleBackToTrips}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                }}>
                                <img
                                    src="/gus-fring.png"
                                    alt="Gustavo"
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </Box>
                            {!loading && isTripsPage ? (
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
                                                                offset: [
                                                                    0, -12,
                                                                ],
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
                                                        backgroundColor:
                                                            '#f4d35e',
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
                                        onClick={handleBackToTrips}
                                        sx={{
                                            fontSize: 18,
                                            cursor: 'pointer',
                                        }}>
                                        {!loading && currentTrip}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        {!isTripsPage && <ToolsMenu />}
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
                    {children}
                </Box>
            </Box>
        </Box>
    )
}
