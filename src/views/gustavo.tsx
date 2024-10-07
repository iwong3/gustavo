import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { create } from 'zustand'

import { Menu } from 'components/menu/menu'
import { SpendTable } from 'components/spend/spend-table'
import { Currency } from 'helpers/currency'
import { Columns, GOOGLE_SHEET_CSV_URL, parseRow } from 'helpers/data-mapping'
import { Person, getPersonFromEmail } from 'helpers/person'
import { Spend, SpendType } from 'helpers/spend'
import GusFringLogo from '../images/gus-fring.png'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import { getTablerIcon } from 'icons/tabler-icons'
import { SpendSummary } from 'components/summary/spend-summary'

type GustavoState = {
    spendData: Spend[]
    filteredSpendData: Spend[]
    showLogs: boolean
}

type GustavoActions = {
    setSpendData: (spendData: Spend[]) => void
    setFilteredSpendData: (filteredSpendData: Spend[]) => void
    setShowLogs: (value: boolean) => void
}

export const useGustavoStore = create<GustavoState & GustavoActions>((set) => ({
    spendData: [],
    filteredSpendData: [],
    showLogs: true,

    setSpendData: (spendData: Spend[]) => set(() => ({ spendData })),
    setFilteredSpendData: (filteredSpendData: Spend[]) => set(() => ({ filteredSpendData })),
    setShowLogs: (showLogs: boolean) => set(() => ({ showLogs })),
}))

export const Gustavo = () => {
    const { filteredSpendData, showLogs, setSpendData, setFilteredSpendData, setShowLogs } =
        useGustavoStore()

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
                                    'transition': 'background-color 0.2s',
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
                                    'transition': 'background-color 0.2s',
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
                {showLogs && <SpendTable spendData={filteredSpendData} />}
                {!showLogs && <SpendSummary />}
            </Box>
            <Menu />
        </Box>
    )
}
