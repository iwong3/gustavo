/**
 * For everything used to map google sheet data
 */

import { Trip } from 'helpers/trips'

export const GOOGLE_FORM_URL =
    'https://docs.google.com/forms/d/e/1FAIpQLSfe5IVFIuHjSET8PODYR77_S5Rrmts5XVM_7PktQT92Gs2Xwg/viewform'

export const GOOGLE_SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs/export?format=csv'

export const GOOGLE_SHEET_VIEW_ONLY_URL =
    'https://docs.google.com/spreadsheets/d/1kVLdZbw_aO7QuyXgHctiuyeI5s87-SgIfZoA0X8zvfs/edit?usp=sharing'

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
