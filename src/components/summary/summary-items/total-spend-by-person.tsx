import { Box } from '@mui/material'

import { useShallow } from 'zustand/react/shallow'
import { FormattedMoney } from 'helpers/currency'
import { InitialsIcon } from 'helpers/icons'
import { Person } from 'helpers/person'
import { useGustavoStore } from 'views/gustavo'

export const TotalSpendByPerson = () => {
    const { totalSpendByPerson } = useGustavoStore(useShallow((state) => state))

    const totalSpendByPersonArray = Array.from(totalSpendByPerson)

    const rowLength = 4
    const renderTotalSpendByPerson = () => {
        const rows = []
        let row = []
        for (let i = 0; i < totalSpendByPersonArray.length; i++) {
            // render current person
            const [person, totalSpend] = totalSpendByPersonArray[i]
            row.push(renderPerson(person, totalSpend))

            // if row is full, push current row and start a new row
            if (row.length === rowLength || i === totalSpendByPersonArray.length - 1) {
                rows.push(
                    <Box
                        key={'total-spend-by-person-row-' + rows.length}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: rows.length === 0 ? 0 : 0.5,
                            marginBottom: i === totalSpendByPersonArray.length - 1 ? 0 : 0.5,
                        }}>
                        {row}
                    </Box>
                )
                row = []
            }
        }
        return rows
    }

    const renderPerson = (person: string, totalSpend: number) => (
        <Box
            key={'total-spend-by-person-' + person}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'space-between',
                width: '23%',
                border: '1px solid #FBBC04',
                borderRadius: '10px',
                backgroundColor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0.5,
                }}>
                <InitialsIcon
                    person={person as Person}
                    sx={{
                        width: 18,
                        height: 18,
                        fontSize: 10,
                    }}
                />
                <Box
                    sx={{
                        marginLeft: 0.5,
                        fontSize: 12,
                    }}>
                    {person}
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    padding: 1,
                    fontSize: 14,
                    fontWeight: 'bold',
                    borderTop: '1px solid #FBBC04',
                }}>
                {FormattedMoney('USD', 2).format(totalSpend)}
            </Box>
        </Box>
    )

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                margin: 1,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 0.5,
                    marginLeft: 0.5,
                    fontSize: 14,
                    fontWeight: 500,
                    fontStyle: 'italic',
                }}>
                By Person
            </Box>
            {renderTotalSpendByPerson()}
        </Box>
    )
}
