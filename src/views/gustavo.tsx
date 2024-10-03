import Box from '@mui/material/Box'
import axios from 'axios'
import { useEffect } from 'react'
import { create } from 'zustand'

import { Menu } from 'components/menu/menu'
import { SpendTable } from 'components/spend/spend-table'
import {
    Columns,
    Currency,
    getPersonFromEmail,
    parseRow,
    Person,
    Spend,
    SpendType,
} from 'helpers/spend'
import GusFringLogo from '../images/gus-fring.png'
import Typography from '@mui/material/Typography'

const googleSheetCsvUrl =
    'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs/export?format=csv'

type GustavoState = {
    spendData: Spend[]
    filteredSpendData: Spend[]

    setSpendData: (spendData: Spend[]) => void
    setFilteredSpendData: (filteredSpendData: Spend[]) => void
}

export const useGustavoStore = create<GustavoState>((set) => ({
    spendData: [],
    filteredSpendData: [],

    setSpendData: (spendData: Spend[]) => set(() => ({ spendData })),
    setFilteredSpendData: (filteredSpendData: Spend[]) => set(() => ({ filteredSpendData })),
}))

export const Gustavo = () => {
    const { filteredSpendData, setSpendData, setFilteredSpendData } = useGustavoStore()

    useEffect(() => {
        async function fetchData() {
            axios.get(googleSheetCsvUrl).then((res: any) => {
                const dataString: string = res.data
                const rows = dataString.split('\n')
                const headers = rows[0].replace(/[\r]/g, '').split(',')

                const dateIndex = headers.indexOf(Columns.Date)
                const nameIndex = headers.indexOf(Columns.ItemName)
                const costIndex = headers.indexOf(Columns.Cost)
                const currencyIndex = headers.indexOf(Columns.Currency)
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
                            const cost = parseFloat(rowValues[costIndex].replace(/[,'"]+/g, ''))
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
                                cost: cost,
                                currency: rowValues[currencyIndex] as Currency,
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
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    margin: 2,
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
                        sx={{ fontSize: '14px', fontFamily: 'Spectral', lineHeight: '90%' }}>
                        "And a man, a man provides...
                    </Typography>
                    <Typography
                        sx={{ fontSize: '14px', fontFamily: 'Spectral', lineHeight: '90%' }}>
                        &nbsp;...your spending habits."
                    </Typography>
                </Box>
            </Box>
            <SpendTable spendData={filteredSpendData} />
            <Menu />
        </Box>
    )
}
