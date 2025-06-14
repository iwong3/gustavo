/**
 * For everything used to map google sheet data
 */

import axios from 'axios'

import { Currency } from 'utils/currency'
import { Location } from 'utils/location'
import { getPersonFromEmail, Person } from 'utils/person'
import { Spend, SpendType } from 'utils/spend'
import { Trip } from 'utils/trips'

type Urls = {
    GoogleFormUrl: string
    GoogleSheetUrl: string
}

export const CsvPath = '/export?format=csv'
export const ViewPath = '/edit?usp=sharing'

export const UrlsByTrip: Map<Trip, Urls> = new Map([
    [
        Trip.Japan2024,
        {
            GoogleFormUrl:
                'https://docs.google.com/forms/d/e/1FAIpQLSfe5IVFIuHjSET8PODYR77_S5Rrmts5XVM_7PktQT92Gs2Xwg/viewform',
            GoogleSheetUrl:
                'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs',
        },
    ],
    [
        Trip.Vancouver2024,
        {
            GoogleFormUrl:
                'https://docs.google.com/forms/d/e/1FAIpQLScCLM3JLZEFFnxEhhzsUe29RBVpmU9gKy649ZHUwpTFLsJJ-A/viewform',
            GoogleSheetUrl:
                'https://docs.google.com/spreadsheets/d/1O1xY4t9RDgKMZWIle644wH1PZEi17LqnU1DI5hJjB6c',
        },
    ],
])

// the google sheet columns
export enum Columns {
    ConvertedCost = 'Converted Cost',
    Cost = 'Cost',
    Currency = 'Currency',
    Date = 'Date',
    Email = 'Email Address',
    ItemName = 'Item Name',
    Location = 'Location',
    Notes = 'Notes',
    PaidBy = 'Paid By',
    ResponseTimestamp = 'Timestamp',
    SpendType = 'Type of Spend',
    SplitBetween = 'Split Between',
    ReceiptImageUrl = 'Upload Receipt',
}

export const fetchData = async (trip: Trip): Promise<[Spend[], boolean]> => {
    let data: Spend[] = []
    let currencyConversionError = false

    try {
        const res = await axios.get(
            UrlsByTrip.get(trip)!.GoogleSheetUrl + CsvPath
        )

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

        data = rows
            .slice(1)
            .map((row: string) => {
                const rowValues = parseRow(row)
                if (rowValues) {
                    let error = false

                    const originalCost = parseFloat(
                        rowValues[originalCostIndex].replace(/[,'"]+/g, '')
                    )
                    const currency = rowValues[currencyIndex] as Currency
                    let convertedCost = parseFloat(
                        rowValues[convertedCostIndex]
                    )
                    if (rowValues[convertedCostIndex] === '#N/A') {
                        convertedCost = 0
                        error = true
                        currencyConversionError = true
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
                        trip: trip,
                        date: rowValues[dateIndex],
                        name: rowValues[nameIndex],
                        originalCost: originalCost,
                        currency: currency,
                        convertedCost: convertedCost,
                        paidBy: rowValues[paidByIndex] as Person,
                        splitBetween: splitBetween,
                        location: rowValues[locationIndex] as Location,
                        type: type,
                        notes: rowValues[notesIndex],
                        reportedBy: reportedBy,
                        reportedAt: rowValues[reportedAtIndex],
                        receiptImageUrl: rowValues[receiptImageUrlIndex],
                        error: error,
                    }
                    return spend
                }
            })
            .filter((row) => row !== undefined) as Spend[]
    } catch (err) {
        throw err
    }

    return [data, currencyConversionError]
}

// given a row string, return an array of the values
export const parseRow = (row: string): string[] => {
    const filteredRow = row.replace(/[\r]/g, '')
    const rowValues: string[] = []

    let currentStr = ''
    let inQuotes = false
    for (let i = 0; i < filteredRow.length; i++) {
        const char = filteredRow[i]
        if (char === '"') {
            inQuotes = !inQuotes
            continue
        }
        if (inQuotes) {
            currentStr += char
            continue
        }
        if (char === ',') {
            rowValues.push(currentStr)
            currentStr = ''
            continue
        }
        currentStr += char
    }
    rowValues.push(currentStr)

    return rowValues
}
