import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import axios from 'axios'
import { useEffect } from 'react'
import { create } from 'zustand'

import { Menu } from 'components/menu/menu'
import { SpendTable } from 'components/spend/spend-table'
import { SpendSummary } from 'components/summary/spend-summary'
import { Currency } from 'helpers/currency'
import { Columns, GOOGLE_SHEET_CSV_URL, parseRow } from 'helpers/data-mapping'
import { getTablerIcon } from 'helpers/icons'
import { Person, getPersonFromEmail } from 'helpers/person'
import { getSplitCost, Spend, SpendType } from 'helpers/spend'
import GusFringLogo from '../images/gus-fring.png'
import { useShallow } from 'zustand/react/shallow'

type GustavoState = {
    // total spend
    spendData: Spend[]
    debtMapByPerson: Map<Person, Map<Person, number>>

    // filtered spend
    filteredSpendData: Spend[]

    // view
    showLogs: boolean
}

type GustavoActions = {
    // total spend
    setSpendData: (spendData: Spend[]) => void
    setDebtMapByPerson: (debtMapByPerson: Map<Person, Map<Person, number>>) => void

    // filtered spend
    setFilteredSpendData: (filteredSpendData: Spend[]) => void

    // view
    setShowLogs: (value: boolean) => void
}

const initialState: GustavoState = {
    spendData: [],
    debtMapByPerson: new Map<Person, Map<Person, number>>(),

    filteredSpendData: [],
    showLogs: true,
}

export const useGustavoStore = create<GustavoState & GustavoActions>((set) => ({
    ...initialState,

    setSpendData: (spendData: Spend[]) => set(() => ({ spendData })),
    setDebtMapByPerson: (debtMapByPerson: Map<Person, Map<Person, number>>) =>
        set(() => ({ debtMapByPerson })),

    setFilteredSpendData: (filteredSpendData: Spend[]) => set(() => ({ filteredSpendData })),
    setShowLogs: (showLogs: boolean) => set(() => ({ showLogs })),
}))

export const Gustavo = () => {
    const {
        spendData,
        filteredSpendData,
        showLogs,
        setSpendData,
        setDebtMapByPerson,
        setFilteredSpendData,
        setShowLogs,
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
                const reportedByIndex = headers.indexOf(Columns.Email)

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
                                location: rowValues[locationIndex],
                                type: type,
                                reportedBy: reportedBy,
                            }
                            return spend
                        }
                    })
                    .filter((row) => row !== undefined) as Spend[]
                setSpendData(data)
                setFilteredSpendData(data)
            })
        }

        fetchData()
    }, [])

    // calculate total spend summary data to expose to summary components
    useEffect(() => {
        const debtMap = new Map<Person, Map<Person, number>>()

        let persons = Object.values(Person).filter((person) => person !== Person.Everyone)
        persons.forEach((person) => {
            debtMap.set(person, new Map<Person, number>())
        })

        spendData.forEach((spend) => {
            const { paidBy, convertedCost, splitBetween } = spend

            /* DEBT MAP */
            // for every spend item, get an array of people splitting the cost
            let splitters: Person[] = splitBetween
            if (splitBetween.includes(Person.Everyone)) {
                splitters = Object.values(Person).filter((person) => person !== Person.Everyone)
            }
            splitters = splitters.filter((person) => person !== paidBy)
            splitters.forEach((splitter) => {
                const splitCost = getSplitCost(convertedCost, splitBetween)

                // update splitter's debt
                let splitterDebtMap = debtMap.get(splitter)
                if (!splitterDebtMap) {
                    splitterDebtMap = new Map<Person, number>()
                }
                splitterDebtMap.set(paidBy, (splitterDebtMap.get(paidBy) || 0) + splitCost)
                debtMap.set(splitter, splitterDebtMap)

                // update paidBy's debt
                let paidByDebtMap = debtMap.get(paidBy)
                if (!paidByDebtMap) {
                    paidByDebtMap = new Map<Person, number>()
                }
                paidByDebtMap.set(splitter, (paidByDebtMap.get(splitter) || 0) - splitCost)
                debtMap.set(paidBy, paidByDebtMap)
            })
        })

        setDebtMapByPerson(debtMap)
    }, [spendData])

    // calculate filtered spend data to expose to spend components
    useEffect(() => {}, [filteredSpendData])

    return (
        <Box>
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
                        margin: 2,
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
                                marginLeft: 2,
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
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                        }}>
                        <ToggleButtonGroup
                            sx={{
                                backgroundColor: 'white',
                            }}>
                            <ToggleButton
                                sx={{
                                    '&.Mui-selected, &.Mui-selected:hover': {
                                        backgroundColor: '#FBBC04',
                                    },
                                    'transition': 'background-color 0.1s ease-in',
                                }}
                                value="left"
                                selected={!showLogs}
                                onClick={() => setShowLogs(false)}>
                                {getTablerIcon({ name: 'IconChartBar', size: 18, fill: 'white' })}
                            </ToggleButton>
                            <ToggleButton
                                sx={{
                                    '&.Mui-selected, &.Mui-selected:hover': {
                                        backgroundColor: '#FBBC04',
                                    },
                                    'transition': 'background-color 0.1s ease-in',
                                }}
                                value="right"
                                selected={showLogs}
                                onClick={() => setShowLogs(true)}>
                                {getTablerIcon({ name: 'IconLayoutList', size: 18, fill: 'white' })}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </Box>
            <Box
                sx={{
                    marginTop: '20%',
                }}>
                {showLogs && <SpendTable />}
                {!showLogs && <SpendSummary />}
            </Box>
            <Menu />
        </Box>
    )
}
