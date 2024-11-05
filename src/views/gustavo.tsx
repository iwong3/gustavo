import { Box, Typography } from '@mui/material'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { ActiveMenuItems } from 'components/menu/active-menu-items'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { Menu } from 'components/menu/menu'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import {
    ToolsMenu,
    ToolsMenuItem,
    ToolsMenuItemMap,
    useToolsMenuStore,
} from 'components/menu/tools/tools-menu'
import { useSummaryStore } from 'components/summary/summary'
import { Currency } from 'helpers/currency'
import { Columns, CsvPath, parseRow, UrlsByTrip } from 'helpers/data-mapping'
import {
    processFilteredSpendData,
    processSpendData,
} from 'helpers/data-processing'
import { Location } from 'helpers/location'
import { getPersonFromEmail, Person } from 'helpers/person'
import { Spend, SpendType } from 'helpers/spend'
import { Trip } from 'helpers/trips'
import { useMainStore } from 'views/main'
import { useTripsStore } from 'views/trips'
import GusFringLogo from '../images/gus-fring.png'

type GustavoState = {
    // total spend
    spendData: Spend[]
    // total spend calculations
    totalSpend: number
    debtMapByPerson: Map<Person, Map<Person, number>>

    // filtered spend
    filteredSpendData: Spend[]
    // filtered spend calculations
    filteredSpendDataWithoutSplitBetween: Spend[]
    filteredSpendDataWithoutSpendType: Spend[]
    filteredSpendDataWithoutLocation: Spend[]
    filteredTotalSpend: number // total spend of the filtered items
    filteredPeopleTotalSpend: number // total spend by filtered people out of the filtered items
    totalSpendByPerson: Map<Person, number>
    totalSpendByType: Map<SpendType, number>
    totalSpendByLocation: Map<Location, number>
    totalSpendByDate: Map<string, number>
    totalSpendByDateByPerson: Map<Person, Map<string, number>>

    error: boolean // error fetching or processing data
}

type GustavoActions = {
    // total spend
    setSpendData: (spendData: Spend[]) => void
    // total spend calculations
    setTotalSpend: (totalSpend: number) => void
    setDebtMapByPerson: (
        debtMapByPerson: Map<Person, Map<Person, number>>
    ) => void

    // filtered spend
    setFilteredSpendData: (filteredSpendData: Spend[]) => void
    // filtered spend calculations
    setFilteredSpendDataWithoutSplitBetween: (
        filteredSpendDataWithoutSplitBetween: Spend[]
    ) => void
    setFilteredSpendDataWithoutSpendType: (
        filteredSpendDataWithoutSpendType: Spend[]
    ) => void
    setFilteredSpendDataWithoutLocation: (
        filteredSpendDataWithoutLocation: Spend[]
    ) => void
    setFilteredTotalSpend: (filteredTotalSpend: number) => void
    setFilteredPeopleTotalSpend: (filteredPeopleTotalSpend: number) => void
    setTotalSpendByPerson: (totalSpendByPerson: Map<Person, number>) => void
    setTotalSpendByType: (totalSpendByType: Map<SpendType, number>) => void
    setTotalSpendByLocation: (
        totalSpendByLocation: Map<Location, number>
    ) => void
    setTotalSpendByDate: (totalSpendByDate: Map<string, number>) => void
    setTotalSpendByDateByPerson: (
        totalSpendByDateByPerson: Map<Person, Map<string, number>>
    ) => void

    setError: (error: boolean) => void
}

const initialState: GustavoState = {
    spendData: [],
    totalSpend: 0,
    debtMapByPerson: new Map<Person, Map<Person, number>>(),

    filteredSpendData: [],
    filteredSpendDataWithoutSplitBetween: [],
    filteredSpendDataWithoutSpendType: [],
    filteredSpendDataWithoutLocation: [],
    filteredTotalSpend: 0,
    filteredPeopleTotalSpend: 0,
    totalSpendByPerson: new Map<Person, number>(),
    totalSpendByType: new Map<SpendType, number>(),
    totalSpendByLocation: new Map<Location, number>(),
    totalSpendByDate: new Map<string, number>(),
    totalSpendByDateByPerson: new Map<Person, Map<string, number>>(),

    error: false,
}

export const useGustavoStore = create<GustavoState & GustavoActions>((set) => ({
    ...initialState,

    setSpendData: (spendData: Spend[]) => set(() => ({ spendData })),
    setTotalSpend: (totalSpend: number) => set(() => ({ totalSpend })),
    setDebtMapByPerson: (debtMapByPerson: Map<Person, Map<Person, number>>) =>
        set(() => ({ debtMapByPerson })),

    setFilteredTotalSpend: (filteredTotalSpend: number) =>
        set(() => ({ filteredTotalSpend })),
    setFilteredSpendDataWithoutSplitBetween: (
        filteredSpendDataWithoutSplitBetween: Spend[]
    ) => set(() => ({ filteredSpendDataWithoutSplitBetween })),
    setFilteredSpendDataWithoutSpendType: (
        filteredSpendDataWithoutSpendType: Spend[]
    ) => set(() => ({ filteredSpendDataWithoutSpendType })),
    setFilteredSpendDataWithoutLocation: (
        filteredSpendDataWithoutLocation: Spend[]
    ) => set(() => ({ filteredSpendDataWithoutLocation })),
    setFilteredPeopleTotalSpend: (filteredPeopleTotalSpend: number) =>
        set(() => ({ filteredPeopleTotalSpend })),
    setFilteredSpendData: (filteredSpendData: Spend[]) =>
        set(() => ({ filteredSpendData })),
    setTotalSpendByPerson: (totalSpendByPerson: Map<Person, number>) =>
        set(() => ({ totalSpendByPerson })),
    setTotalSpendByType: (totalSpendByType: Map<SpendType, number>) =>
        set(() => ({ totalSpendByType })),
    setTotalSpendByLocation: (totalSpendByLocation: Map<Location, number>) =>
        set(() => ({ totalSpendByLocation })),
    setTotalSpendByDate: (totalSpendByDate: Map<string, number>) =>
        set(() => ({ totalSpendByDate })),
    setTotalSpendByDateByPerson: (
        totalSpendByDateByPerson: Map<Person, Map<string, number>>
    ) => set(() => ({ totalSpendByDateByPerson })),

    setError: (error: boolean) => set(() => ({ error })),
}))

export const Gustavo = () => {
    const {
        spendData,
        filteredSpendData,
        filteredSpendDataWithoutSplitBetween,
        filteredSpendDataWithoutSpendType,
        filteredSpendDataWithoutLocation,
        setSpendData,
        setTotalSpend,
        setDebtMapByPerson,
        setFilteredSpendData,
        setFilteredSpendDataWithoutSplitBetween,
        setFilteredSpendDataWithoutSpendType,
        setFilteredSpendDataWithoutLocation,
        setFilteredTotalSpend,
        setFilteredPeopleTotalSpend,
        setTotalSpendByPerson,
        setTotalSpendByType,
        setTotalSpendByLocation,
        setTotalSpendByDate,
        setTotalSpendByDateByPerson,
        error,
        setError,
    } = useGustavoStore(useShallow((state) => state))
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    const fetchData = async (trip: Trip) => {
        axios
            .get(UrlsByTrip.get(trip)!.GoogleSheetUrl + CsvPath)
            .then((res: any) => {
                const dataString: string = res.data
                const rows = dataString.split('\n')
                const headers = rows[0].replace(/[\r]/g, '').split(',')

                const nameIndex = headers.indexOf(Columns.ItemName)
                const dateIndex = headers.indexOf(Columns.Date)
                const originalCostIndex = headers.indexOf(Columns.Cost)
                const currencyIndex = headers.indexOf(Columns.Currency)
                const convertedCostIndex = headers.indexOf(
                    Columns.ConvertedCost
                )
                const paidByIndex = headers.indexOf(Columns.PaidBy)
                const splitBetweenIndex = headers.indexOf(Columns.SplitBetween)
                const locationIndex = headers.indexOf(Columns.Location)
                const typeIndex = headers.indexOf(Columns.SpendType)
                const notesIndex = headers.indexOf(Columns.Notes)
                const reportedByIndex = headers.indexOf(Columns.Email)
                const reportedAtIndex = headers.indexOf(
                    Columns.ResponseTimestamp
                )
                const receiptImageUrlIndex = headers.indexOf(
                    Columns.ReceiptImageUrl
                )

                const data = rows
                    .slice(1)
                    .map((row: string) => {
                        const rowValues = parseRow(row)
                        if (rowValues) {
                            let error = false

                            const originalCost = parseFloat(
                                rowValues[originalCostIndex].replace(
                                    /[,'"]+/g,
                                    ''
                                )
                            )
                            const currency = rowValues[
                                currencyIndex
                            ] as Currency
                            let convertedCost = parseFloat(
                                rowValues[convertedCostIndex]
                            )
                            if (rowValues[convertedCostIndex] === '#N/A') {
                                convertedCost = 0
                                error = true
                                setError(true)
                            }

                            const splitBetween = rowValues[splitBetweenIndex]
                                .replace(/['" ]+/g, '')
                                .split(',') as Person[]
                            const type =
                                rowValues[typeIndex] === ''
                                    ? undefined
                                    : (rowValues[typeIndex] as SpendType)
                            const reportedBy = getPersonFromEmail(
                                rowValues[reportedByIndex].replace(/\s/g, '')
                            )

                            const spend: Spend = {
                                date: rowValues[dateIndex],
                                name: rowValues[nameIndex],
                                originalCost: originalCost,
                                currency: currency,
                                convertedCost: convertedCost,
                                paidBy: rowValues[paidByIndex] as Person,
                                splitBetween: splitBetween,
                                location: (rowValues[locationIndex] as Location)
                                    ? (rowValues[locationIndex] as Location)
                                    : Location.Other,
                                type: type,
                                notes: rowValues[notesIndex],
                                reportedBy: reportedBy,
                                reportedAt: rowValues[reportedAtIndex],
                                receiptImageUrl:
                                    rowValues[receiptImageUrlIndex],
                                error: error,
                            }
                            return spend
                        }
                    })
                    .filter((row) => row !== undefined) as Spend[]

                setSpendData(data)
                setFilteredSpendData(data)
                setFilteredSpendDataWithoutSplitBetween(data)
                setFilteredSpendDataWithoutSpendType(data)
                setFilteredSpendDataWithoutLocation(data)
            })
            .catch((_) => {
                setError(true)
            })
    }

    useEffect(() => {
        fetchData(currentTrip)
    }, [currentTrip])

    // calculate total spend summary data to expose to summary components
    useEffect(() => {
        const { totalSpend, debtMap } = processSpendData(spendData, currentTrip)

        setTotalSpend(totalSpend)
        setDebtMapByPerson(debtMap)
    }, [spendData])

    // calculate filtered spend data to expose to spend components
    const { filters: splitBetweenFilter } = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )
    useEffect(() => {
        const {
            filteredTotalSpend,
            filteredPeopleTotalSpend,
            totalSpendByPerson,
            totalSpendByType,
            totalSpendByLocation,
            totalSpendByDate,
            totalSpendByDateByPerson,
        } = processFilteredSpendData(
            filteredSpendData,
            filteredSpendDataWithoutSplitBetween,
            filteredSpendDataWithoutSpendType,
            filteredSpendDataWithoutLocation,
            splitBetweenFilter,
            currentTrip
        )

        setFilteredTotalSpend(filteredTotalSpend)
        setFilteredPeopleTotalSpend(filteredPeopleTotalSpend)
        setTotalSpendByPerson(totalSpendByPerson)
        setTotalSpendByType(totalSpendByType)
        setTotalSpendByLocation(totalSpendByLocation)
        setTotalSpendByDate(totalSpendByDate)
        setTotalSpendByDateByPerson(totalSpendByDateByPerson)
    }, [
        filteredSpendData,
        // filteredSpendDataWithoutSplitBetween,
        // filteredSpendDataWithoutSpendType,
        // filteredSpendDataWithoutLocation,
    ])

    const { activeItem, setActiveItem } = useToolsMenuStore(
        useShallow((state) => state)
    )
    const { setActiveView } = useSummaryStore(useShallow((state) => state))
    const { showIconLabels } = useSettingsIconLabelsStore(
        useShallow((state) => state)
    )

    // swipe left & right
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null) // otherwise the swipe is fired even with usual touch events
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        const items = Object.values(ToolsMenuItem)
        const currentIndex = items.indexOf(activeItem)

        // next item
        if (isLeftSwipe) {
            const nextIndex = (currentIndex + 1) % items.length
            let nextItem = items[nextIndex]

            if (nextItem === ToolsMenuItem.TotalSpend) {
                nextItem = items[nextIndex + 1]
            }
            if (ToolsMenuItemMap.get(nextItem)!.summaryView) {
                setActiveView(ToolsMenuItemMap.get(nextItem)!.summaryView!)
            }
            setActiveItem(nextItem)
        }

        // previous item
        if (isRightSwipe) {
            const prevIndex = (currentIndex - 1 + items.length) % items.length
            let prevItem = items[prevIndex]

            if (prevItem === ToolsMenuItem.TotalSpend) {
                prevItem = items[prevIndex - 1]
            }
            if (ToolsMenuItemMap.get(prevItem)!.summaryView) {
                setActiveView(ToolsMenuItemMap.get(prevItem)!.summaryView!)
            }
            setActiveItem(prevItem)
        }
    }

    // trip selector
    const { setShowTripsMenu } = useMainStore()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: 450,
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
                            onClick={() => setShowTripsMenu(true)}
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
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                marginLeft: 1,
                            }}>
                            <Typography
                                sx={{
                                    fontSize: error ? 12 : 14,
                                    fontFamily: 'Spectral',
                                    color: error ? '#c1121f' : 'black',
                                    lineHeight: error ? '100%' : '90%',
                                }}>
                                {error
                                    ? '"It appears there\'s been a... problem.'
                                    : '"And a man, a man provides...'}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: error ? 12 : 14,
                                    fontFamily: 'Spectral',
                                    color: error ? '#c1121f' : 'black',
                                    lineHeight: error ? '100%' : '90%',
                                }}>
                                &nbsp;
                                {error
                                    ? 'My apologies. I will... take care of it."'
                                    : ' ...your spending habits."'}
                            </Typography>
                        </Box>
                    </Box>
                    <ToolsMenu />
                </Box>
            </Box>
            <Box
                sx={{
                    marginTop: '17%',
                    marginBottom: 1,
                    maxWidth: 450,
                }}>
                <ActiveMenuItems />
            </Box>
            <Box
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                sx={{
                    height: showIconLabels
                        ? window.innerHeight * 0.72
                        : window.innerHeight * 0.74,
                    maxHeight: showIconLabels
                        ? window.innerHeight * 0.72
                        : window.innerHeight * 0.74,
                    maxWidth: 450,
                    overflow: 'hidden',
                    overflowY: 'scroll',
                }}>
                {ToolsMenuItemMap.get(activeItem)?.component}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                <Menu />
            </Box>
        </Box>
    )
}
