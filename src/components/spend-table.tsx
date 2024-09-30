import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { Currency, Person } from 'helpers/spend'

export interface Spend {
    date: string
    name: string
    cost: number
    currency: Currency
    paidBy: Person
    splitBetween: Person[]
    location: string
    type: string
    reportedBy: Person | undefined
}

interface ISpendTableProps {
    spendData: Spend[]
}

export const SpendTable = ({ spendData }: ISpendTableProps) => {
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        {defaultSpendColumns.map((column) => (
                            <TableCell key={column.id} align="right">
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {spendData.map((row) => (
                        <TableRow
                            key={row.name}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell component="th" scope="row">
                                {row.date}
                            </TableCell>
                            <TableCell align="right">{row.name}</TableCell>
                            <TableCell align="right">{row.location}</TableCell>
                            <TableCell align="right">{row.type}</TableCell>
                            <TableCell align="right">{row.cost}</TableCell>
                            <TableCell align="right">{row.cost}</TableCell>
                            <TableCell align="right">{row.cost}</TableCell>
                            <TableCell align="right">{row.paidBy}</TableCell>
                            <TableCell align="right">{row.splitBetween.join(', ')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

const defaultSpendColumns = [
    {
        id: 'date',
        label: 'Date',
        index: 0,
    },
    {
        id: 'item',
        label: 'Item',
        index: 1,
    },
    {
        id: 'location',
        label: 'Location',
        index: 2,
    },
    {
        id: 'type',
        label: 'Type',
        index: 3,
    },
    {
        id: 'cost-usd',
        label: 'USD ($)',
        index: 4,
    },
    {
        id: 'cost-yen',
        label: 'YEN (¥)',
        index: 5,
    },
    {
        id: 'cost',
        label: 'Cost ($)',
        index: 6,
    },
    {
        id: 'paid-by',
        label: 'Paid By',
        index: 7,
    },
    {
        id: 'split-between',
        label: 'Split Between',
        index: 8,
    },
]
