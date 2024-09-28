import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

export const TrackSpendTable = () => {
    return ExampleTable()
}

const createData = (
    name: string,
    calories: number,
    fat: number,
    carbs: number,
    protein: number
) => {
    return { name, calories, fat, carbs, protein }
}

const rows = [
    createData('Frozen yoghurt', 159, 6.0, 24, 4.0),
    createData('Ice cream sandwich', 237, 9.0, 37, 4.3),
    createData('Eclair', 262, 16.0, 24, 6.0),
    createData('Cupcake', 305, 3.7, 67, 4.3),
    createData('Gingerbread', 356, 16.0, 49, 3.9),
]

const columns = [
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
        id: 'cost-usd',
        label: 'USD ($)',
        index: 2,
    },
    {
        id: 'cost-yen',
        label: 'YEN (¥)',
        index: 3,
    },
    {
        id: 'paid-by',
        label: 'Paid By',
        index: 4,
    },
    {
        id: 'split-between',
        label: 'Split Between',
        index: 5,
    },
    {
        id: 'split-cost',
        label: 'Split Cost',
        index: 6,
    },
]

const ExampleTable = () => {
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell key={column.id} align="right">
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow
                            key={row.name}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell component="th" scope="row">
                                {row.name}
                            </TableCell>
                            <TableCell align="right">{row.calories}</TableCell>
                            <TableCell align="right">{row.fat}</TableCell>
                            <TableCell align="right">{row.carbs}</TableCell>
                            <TableCell align="right">{row.protein}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
