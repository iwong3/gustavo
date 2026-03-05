'use client'

import { Box } from '@mui/material'
import { useParams, notFound } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useDebtCalculatorStore } from 'components/debt/debt-calculator'
import { resetAllMenuItemStores } from 'components/menu/menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useToolsMenuStore } from 'components/menu/tools/tools-menu'
import { fetchExpenses } from 'utils/api'
import { saveInCache } from 'utils/cache'
import { getTablerIcon } from 'utils/icons'
import { slugToTrip } from 'utils/trips'
import { Gustavo, useGustavoStore } from 'views/gustavo'
import { useTripsStore } from 'views/trips'

export default function TripDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const trip = slugToTrip(slug)
    const initialized = useRef(false)

    const {
        setCurrentTrip,
        setLoading,
        setFetchDataError,
        setCurrencyConversionError,
        fetchDataError,
    } = useTripsStore(useShallow((state) => state))

    const {
        setSpendData,
        setFilteredSpendData,
        setFilteredSpendDataWithoutSplitBetween,
        setFilteredSpendDataWithoutSpendType,
        setFilteredSpendDataWithoutLocation,
    } = useGustavoStore(useShallow((state) => state))

    const { reset: resetSearchBarStore } = useSearchBarStore(
        useShallow((state) => state)
    )
    const { reset: resetToolsMenuStore } = useToolsMenuStore(
        useShallow((state) => state)
    )
    const { reset: resetDebtCalculatorStore } = useDebtCalculatorStore(
        useShallow((state) => state)
    )

    useEffect(() => {
        if (!trip || initialized.current) return
        initialized.current = true

        async function loadTrip() {
            try {
                const [data, currencyConversionError] =
                    await fetchExpenses(trip!)

                if (currencyConversionError) {
                    setCurrencyConversionError(true)
                }

                setSpendData(data)
                setFilteredSpendData(data)
                setFilteredSpendDataWithoutSplitBetween(data)
                setFilteredSpendDataWithoutSpendType(data)
                setFilteredSpendDataWithoutLocation(data)

                resetAllMenuItemStores(trip!)
                resetSearchBarStore()
                resetToolsMenuStore()
                resetDebtCalculatorStore()

                setCurrentTrip(trip!)
                saveInCache('currentTrip', slug)
            } catch (err) {
                console.error(err)
                setFetchDataError(true)
            } finally {
                setLoading(false)
            }
        }

        loadTrip()
    }, [trip, slug])

    if (!trip) {
        notFound()
    }

    if (fetchDataError) {
        return (
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
                    There was an error loading trip data. Please refresh to try
                    again.
                </Box>
            </Box>
        )
    }

    return <Gustavo />
}
