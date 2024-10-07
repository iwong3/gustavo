import Box from '@mui/material/Box'
import { SummaryByDate } from 'components/summary/summary-items/summary-by-date'

import { SummaryByPerson } from 'components/summary/summary-items/summary-by-person'

/**
 * Summarizes every person's spend data
 * - Total covered
 * - Total spent (net spent)
 * - Total owed
 * - Total owed to each person
 *
 * Other views / ideas
 * - Total spend by day
 * - Bar graph of total spend by person
 * - Whole trip totals
 * - Click any 2 people to show their debts to each other
 * - Horizontally scrollable graphs
 */

export const SpendSummary = () => {
    return (
        <Box
            sx={{
                marginBottom: 16,
            }}>
            <h1>Spend Summary</h1>
            <SummaryByPerson />
            <SummaryByDate />
        </Box>
    )
}
