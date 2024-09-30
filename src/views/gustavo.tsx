import axios from 'axios'
import { useEffect, useState } from 'react'

import { Spend, SpendTable } from 'components/spend-table'
import { Columns, Currency, getPersonFromEmail, Person } from 'helpers/spend'

const googleSheetCsvUrl =
    'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs/export?format=csv'

const rowSplitByCommaRegex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g

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

            // need to fix comma splitting:
            // - split by commas but ignore quotes
            // - include empty cell if value missing
            // - use csv library?
            const data = rows
                .slice(1)
                .map((row: string) => {
                    const rowValues = row.match(rowSplitByCommaRegex)
                    console.log(rowValues)
                    if (rowValues) {
                        const spend: Spend = {
                            date: rowValues[dateIndex],
                            name: rowValues[nameIndex],
                            cost: parseFloat(rowValues[costIndex].replace(/[,'"]+/g, '')),
                            currency: rowValues[currencyIndex] as Currency,
                            paidBy: rowValues[paidByIndex] as Person,
                            splitBetween: rowValues[splitBetweenIndex]
                                .replace(/['"]+/g, '')
                                .split(',') as Person[],
                            location: rowValues[locationIndex],
                            type: rowValues[typeIndex],
                            reportedBy: getPersonFromEmail(rowValues[reportedByIndex]),
                        }
                        return spend
                    }
                })
                .filter((row) => row !== undefined) as Spend[]
            setSpendData(data)

            console.log(data)
        })
    }, [])

    return (
        <div>
            <SpendTable spendData={spendData} />
        </div>
    )
}
