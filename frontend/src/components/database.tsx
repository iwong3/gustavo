import React from 'react'
import styled from 'styled-components'

const StyledDatabase = styled.table`
    table {
        // border: 1px solid;
        border-collapse: collapse;
    }

    tr {
        border: 1px solid;
    }

    td {
        padding: 5px 10px;
        border: 1px solid;
    }
`

interface DatabaseProps {
    numRows: number
    numCols: number
}
export const Database = ({ numRows, numCols }: DatabaseProps) => {
    const renderDatabase = () => {
        const rows = []
        // create header row
        const headers = []

        for (let row = 0; row < numRows; row++) {
            const cols = []
            for (let col = 0; col < numCols; col++) {
                const cellContent = `row${row}-col${col}`
                cols.push(
                    <td id={cellContent} onClick={() => {}}>
                        {cellContent}
                    </td>
                )
            }
            const rowId = `row${row}`
            rows.push(<tr id={rowId}>{cols}</tr>)
        }
        return (
            <StyledDatabase>
                <table>
                    <tbody>{rows}</tbody>
                </table>
            </StyledDatabase>
        )
    }

    return <div>{renderDatabase()}</div>
}
