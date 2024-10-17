import { Box, Typography } from '@mui/material'
import axios from 'axios'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { ActiveMenuItems } from 'components/menu/active-menu-items'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { Menu } from 'components/menu/menu'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { ToolsMenu, ToolsMenuItemMap, useToolsMenuStore } from 'components/menu/tools/tools-menu'
import { Currency } from 'helpers/currency'
import { Columns, GOOGLE_SHEET_CSV_URL, parseRow } from 'helpers/data-mapping'
import { processFilteredSpendData, processSpendData } from 'helpers/data-processing'
import { Location } from 'helpers/location'
import { Person, getPersonFromEmail } from 'helpers/person'
import { Spend, SpendType } from 'helpers/spend'
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
}

type GustavoActions = {
    // total spend
    setSpendData: (spendData: Spend[]) => void
    // total spend calculations
    setTotalSpend: (totalSpend: number) => void
    setDebtMapByPerson: (debtMapByPerson: Map<Person, Map<Person, number>>) => void

    // filtered spend
    setFilteredSpendData: (filteredSpendData: Spend[]) => void
    // filtered spend calculations
    setFilteredSpendDataWithoutSplitBetween: (filteredSpendDataWithoutSplitBetween: Spend[]) => void
    setFilteredSpendDataWithoutSpendType: (filteredSpendDataWithoutSpendType: Spend[]) => void
    setFilteredSpendDataWithoutLocation: (filteredSpendDataWithoutLocation: Spend[]) => void
    setFilteredTotalSpend: (filteredTotalSpend: number) => void
    setFilteredPeopleTotalSpend: (filteredPeopleTotalSpend: number) => void
    setTotalSpendByPerson: (totalSpendByPerson: Map<Person, number>) => void
    setTotalSpendByType: (totalSpendByType: Map<SpendType, number>) => void
    setTotalSpendByLocation: (totalSpendByLocation: Map<Location, number>) => void
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
}

export const useGustavoStore = create<GustavoState & GustavoActions>((set) => ({
    ...initialState,

    setSpendData: (spendData: Spend[]) => set(() => ({ spendData })),
    setTotalSpend: (totalSpend: number) => set(() => ({ totalSpend })),
    setDebtMapByPerson: (debtMapByPerson: Map<Person, Map<Person, number>>) =>
        set(() => ({ debtMapByPerson })),

    setFilteredTotalSpend: (filteredTotalSpend: number) => set(() => ({ filteredTotalSpend })),
    setFilteredSpendDataWithoutSplitBetween: (filteredSpendDataWithoutSplitBetween: Spend[]) =>
        set(() => ({ filteredSpendDataWithoutSplitBetween })),
    setFilteredSpendDataWithoutSpendType: (filteredSpendDataWithoutSpendType: Spend[]) =>
        set(() => ({ filteredSpendDataWithoutSpendType })),
    setFilteredSpendDataWithoutLocation: (filteredSpendDataWithoutLocation: Spend[]) =>
        set(() => ({ filteredSpendDataWithoutLocation })),
    setFilteredPeopleTotalSpend: (filteredPeopleTotalSpend: number) =>
        set(() => ({ filteredPeopleTotalSpend })),
    setFilteredSpendData: (filteredSpendData: Spend[]) => set(() => ({ filteredSpendData })),
    setTotalSpendByPerson: (totalSpendByPerson: Map<Person, number>) =>
        set(() => ({ totalSpendByPerson })),
    setTotalSpendByType: (totalSpendByType: Map<SpendType, number>) =>
        set(() => ({ totalSpendByType })),
    setTotalSpendByLocation: (totalSpendByLocation: Map<Location, number>) =>
        set(() => ({ totalSpendByLocation })),
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
    } = useGustavoStore(useShallow((state) => state))

    useEffect(() => {
        async function fetchData() {
            axios.get(GOOGLE_SHEET_CSV_URL).then((res: any) => {
                const dataString: string = res.data
                const rows = dataString.split('\n')
                const headers = rows[0].replace(/[\r]/g, '').split(',')

                const nameIndex = headers.indexOf(Columns.ItemName)
                const dateIndex = headers.indexOf(Columns.Date)
                const originalCostIndex = headers.indexOf(Columns.Cost)
                const currencyIndex = headers.indexOf(Columns.Currency)
                const convertedCostIndex = headers.indexOf(Columns.ConvertedCost)
                const paidByIndex = headers.indexOf(Columns.PaidBy)
                const splitBetweenIndex = headers.indexOf(Columns.SplitBetween)
                const locationIndex = headers.indexOf(Columns.Location)
                const typeIndex = headers.indexOf(Columns.SpendType)
                const notesIndex = headers.indexOf(Columns.Notes)
                const reportedByIndex = headers.indexOf(Columns.Email)
                const reportedAtIndex = headers.indexOf(Columns.ResponseTimestamp)
                const receiptImageUrlIndex = headers.indexOf(Columns.ReceiptImageUrl)

                const data = rows
                    .slice(1)
                    .map((row: string) => {
                        const rowValues = parseRow(row)
                        if (rowValues) {
                            const originalCost = parseFloat(
                                rowValues[originalCostIndex].replace(/[,'"]+/g, '')
                            )
                            const currency = rowValues[currencyIndex] as Currency
                            const convertedCost = parseFloat(rowValues[convertedCostIndex])

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
                                receiptImageUrl: rowValues[receiptImageUrlIndex],
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
        }

        fetchData()
    }, [])

    // calculate total spend summary data to expose to summary components
    useEffect(() => {
        const { totalSpend, debtMap } = processSpendData(spendData)

        setTotalSpend(totalSpend)
        setDebtMapByPerson(debtMap)
    }, [spendData])

    // calculate filtered spend data to expose to spend components
    const { filters: splitBetweenFilter } = useFilterSplitBetweenStore(useShallow((state) => state))
    useEffect(() => {
        const {
            filteredTotalSpend,
            filteredPeopleTotalSpend,
            totalSpendByPerson,
            totalSpendByType,
            totalSpendByLocation,
        } = processFilteredSpendData(
            filteredSpendData,
            filteredSpendDataWithoutSplitBetween,
            filteredSpendDataWithoutSpendType,
            filteredSpendDataWithoutLocation,
            splitBetweenFilter
        )

        setFilteredTotalSpend(filteredTotalSpend)
        setFilteredPeopleTotalSpend(filteredPeopleTotalSpend)
        setTotalSpendByPerson(totalSpendByPerson)
        setTotalSpendByType(totalSpendByType)
        setTotalSpendByLocation(totalSpendByLocation)
    }, [
        filteredSpendData,
        filteredSpendDataWithoutSplitBetween,
        filteredSpendDataWithoutSpendType,
        filteredSpendDataWithoutLocation,
    ])

    const { activeItem } = useToolsMenuStore(useShallow((state) => state))
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

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
                        <img
                            src={GusFringLogo}
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: '100%',
                                objectFit: 'cover',
                            }}
                        />
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                marginLeft: 1,
                            }}>
                            <Typography
                                sx={{
                                    fontSize: '14px',
                                    fontFamily: 'Spectral',
                                    lineHeight: '90%',
                                }}>
                                "And a man, a man provides...
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '14px',
                                    fontFamily: 'Spectral',
                                    lineHeight: '90%',
                                }}>
                                &nbsp;...your spending habits."
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
                sx={{
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
