import { Box, Link, Typography } from '@mui/material'
import { HandCoins, UserCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { FormattedMoney } from 'helpers/currency'
import { getTablerIcon, InitialsIcon } from 'helpers/icons'
import { getVenmoUrl, Person } from 'helpers/person'
import { useGustavoStore } from 'views/gustavo'
import VenmoLogo from '../../../../images/venmo-icon.png'

type SummaryDebtState = {
    person1: Person | undefined
    person2: Person | undefined
}

type SummaryDebtActions = {
    setPerson1: (person: Person | undefined) => void
    setPerson2: (person: Person | undefined) => void
}

const initialState: SummaryDebtState = {
    person1: undefined,
    person2: undefined,
}

export const useSummaryDebtStore = create<SummaryDebtState & SummaryDebtActions>((set) => ({
    ...initialState,

    setPerson1: (person: Person | undefined) => {
        set(() => ({ person1: person }))
    },
    setPerson2: (person: Person | undefined) => {
        set(() => ({ person2: person }))
    },
}))

/**
 * Ideas
 * - Add expand button
 * - Include menu at top of expanded box
 *   - Reset
 * - Include a list of spend between the two selected people
 */
export const SummaryDebt = () => {
    const { person1, person2, setPerson1, setPerson2 } = useSummaryDebtStore(
        useShallow((state) => state)
    )
    const { debtMapByPerson } = useGustavoStore(useShallow((state) => state))

    // Debt state and style
    const [debt, setDebt] = useState(0)

    // calculate debt
    useEffect(() => {
        if (person1 && person2) {
            const debt = debtMapByPerson.get(person1)?.get(person2) || 0
            setDebt(debt)
        } else {
            setDebt(0)
        }
    }, [person1, person2])

    const debtAbsolute = Math.abs(debt)
    const debtString = FormattedMoney('USD', 2).format(debtAbsolute)

    // Debt person state and style
    const debtPersonWidth = window.innerWidth * 0.3

    const renderDebtPerson = (
        person: Person | undefined,
        setPerson: (person: Person | undefined) => void
    ) => {
        return (
            <Box
                onClick={() => {
                    setPerson(undefined)
                }}
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: debtPersonWidth,
                    height: debtPersonWidth,
                }}>
                <InitialsIcon
                    person={person!}
                    sx={{
                        width: person ? 100 : 0,
                        height: person ? 100 : 0,
                        fontSize: 32,
                        opacity: person ? 1 : 0,
                        transition: 'opacity 0.2s ease-out',
                    }}
                />
                <UserCircle
                    weight="duotone"
                    color="#495057"
                    style={{
                        width: person ? 0 : 120,
                        height: person ? 0 : 120,
                        opacity: person ? 0 : 1,
                        transition: 'opacity 0.2s ease-out',
                    }}
                />
            </Box>
        )
    }

    // Select person state and style
    const [expanded, setExpanded] = useState(false)

    const people = Object.values(Person).filter((person) => person !== Person.Everyone)

    const handleSelectPerson = (person: Person) => {
        if (person === person1) {
            setPerson1(undefined)
        } else if (person === person2) {
            setPerson2(undefined)
        } else if (!person1) {
            setPerson1(person)
        } else if (!person2) {
            setPerson2(person)
        }
    }

    const renderSelectPerson = (person: Person) => {
        const isActive = person === person1 || person === person2
        const disabled = person1 && person2 && person !== person1 && person !== person2
        const disabledSx = { color: 'black', backgroundColor: 'lightgray' }

        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingY: 2,
                    width: '100%',
                    border: '1px solid #FBBC04',
                    borderRadius: '10px',
                    backgroundColor: isActive ? '#F4D35E' : 'white',
                }}
                onClick={() => {
                    handleSelectPerson(person)
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                    <InitialsIcon
                        person={person}
                        sx={{
                            marginRight: 1,
                            marginLeft: 1.5,
                            width: 28,
                            height: 28,
                            fontSize: 14,
                            ...(disabled ? disabledSx : {}),
                        }}
                    />
                    <Typography
                        sx={{
                            fontSize: 14,
                        }}>
                        {person}
                    </Typography>
                </Box>
                <Link
                    href={getVenmoUrl(person)}
                    target="_blank"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: 1,
                    }}>
                    <img
                        src={VenmoLogo}
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: '100%',
                            objectFit: 'cover',
                            filter: disabled ? 'grayscale(100%)' : 'none',
                        }}
                    />
                </Link>
            </Box>
        )
    }

    const renderSelectPersonRows = () => {
        const rows = []
        const rowLength = 2
        let row = []
        for (let i = 0; i < people.length; i++) {
            row.push(
                <Box
                    key={'select-person-' + i + 1}
                    sx={{
                        marginRight: row.length === 0 ? 1 : 0,
                        marginLeft: row.length === 1 ? 1 : 0,
                        width: '100%',
                    }}>
                    {renderSelectPerson(people[i])}
                </Box>
            )
            if (row.length === rowLength) {
                rows.push(
                    <Box
                        key={'select-person-row-' + rows.length + 1}
                        sx={{
                            display: 'flex',
                            marginBottom: i === people.length - 1 ? 0 : 1,
                        }}>
                        {row}
                    </Box>
                )
                row = []
            }
        }
        return rows
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                margin: 1,
                border: '1px solid #FBBC04',
                borderRadius: '20px',
                backgroundColor: 'white',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 2,
                    paddingX: 2,
                }}>
                {renderDebtPerson(person1, setPerson1)}
                {/* Debt amount */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}>
                    <Typography
                        sx={{
                            fontSize: 18,
                            fontWeight: 'bold',
                        }}>
                        {debtString}
                    </Typography>
                    <Box>
                        {debt < 0 && <HandCoins size={24} mirrored />}
                        {debt > 0 && <HandCoins size={24} />}
                    </Box>
                </Box>
                {renderDebtPerson(person2, setPerson2)}
            </Box>
            <Box
                onClick={() => {
                    setExpanded(!expanded)
                }}
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                {!expanded && getTablerIcon({ name: 'IconCaretDown' })}
                {expanded && getTablerIcon({ name: 'IconCaretUp' })}
            </Box>
            {/* Select person */}
            <Box
                sx={{
                    maxHeight: expanded ? 'auto' : 0,
                    opacity: expanded ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.05s ease-out, opacity 0.1s ease-in',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 2,
                        borderTop: '1px solid #FBBC04',
                    }}>
                    {renderSelectPersonRows()}
                </Box>
            </Box>
        </Box>
    )
}
