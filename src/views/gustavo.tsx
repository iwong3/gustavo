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
import { FilterPaidBy, useFilterPaidByStore } from 'components/filter/filter-items/filter-paid-by'
import GusFringLogo from '../images/gus-fring.png'
import {
    FilterSpendType,
    useFilterSpendTypeStore,
} from 'components/filter/filter-items/filter-spend-type'

const googleSheetCsvUrl =
    'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs/export?format=csv'

export const Gustavo = () => {
    const [spendData, setSpendData] = useState<Spend[]>([])
    const [filteredSpendData, setFilteredSpendData] = useState<Spend[]>([])

    useEffect(() => {
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
    }, [])

    const paidByEveryone = useFilterPaidByStore((state) => state.everyone)
    const paidByFilters = useFilterPaidByStore((state) => state.filters)
    const filterByPaidBy = useFilterPaidByStore((state) => state.filterByPaidBy)

    const spendTypeAll = useFilterSpendTypeStore((state) => state.all)
    const spendTypeFilters = useFilterSpendTypeStore((state) => state.filters)
    const filterBySpendType = useFilterSpendTypeStore((state) => state.filterBySpendType)

    useEffect(() => {
        let filteredSpendData = spendData
        filteredSpendData = filterByPaidBy(filteredSpendData)
        filteredSpendData = filterBySpendType(filteredSpendData)
        setFilteredSpendData(filteredSpendData)
    }, [paidByEveryone, paidByFilters, spendTypeAll, spendTypeFilters])

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
            </Box>
            <Box
                sx={{
                    marginBottom: 2,
                }}>
                <FilterPaidBy />
                <Box sx={{ marginTop: 1 }}>
                    <FilterSpendType />
                </Box>
            </Box>
            <SpendTable spendData={filteredSpendData} />
        </Box>
    )
}
