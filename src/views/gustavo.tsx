import axios from 'axios'
import { useEffect, useState } from 'react'

import { SpendTable } from 'components/spend-table'
import {
    Columns,
    Currency,
    getPersonFromEmail,
    parseRow,
    Person,
    Spend,
    SpendType,
} from 'helpers/spend'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const googleSheetCsvUrl =
    'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs/export?format=csv'

export const Gustavo = () => {
    const [spendData, setSpendData] = useState<Spend[]>([])

    useEffect(() => {
        axios.get(googleSheetCsvUrl).then((res: any) => {
            const dataString: string = res.data
            const rows = dataString.split('\n')
            const headers = rows[0].split(',')

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
                        const spend: Spend = {
                            date: rowValues[dateIndex],
                            name: rowValues[nameIndex],
                            cost: parseFloat(rowValues[costIndex].replace(/[,'"]+/g, '')),
                            currency: rowValues[currencyIndex] as Currency,
                            paidBy: rowValues[paidByIndex] as Person,
                            splitBetween: rowValues[splitBetweenIndex]
                                .replace(/['" ]+/g, '')
                                .split(',') as Person[],
                            location: rowValues[locationIndex],
                            type: rowValues[typeIndex] as SpendType,
                            reportedBy: getPersonFromEmail(rowValues[reportedByIndex]),
                        }
                        return spend
                    }
                })
                .filter((row) => row !== undefined) as Spend[]
            setSpendData(data)
        })
    }, [])

    return (
        <Box>
            <Typography variant="h4" sx={{ m: 1 }}>
                Gustavo
            </Typography>
            <SpendTable spendData={spendData} />
        </Box>
    )
}
