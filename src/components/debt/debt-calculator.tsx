import { Box, Link, Typography } from '@mui/material'
import { UserCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { ReceiptsList } from 'components/receipts/receipts-list'
import { FormattedMoney } from 'helpers/currency'
import { getTablerIcon, InitialsIcon } from 'helpers/icons'
import { getVenmoUrl, Person } from 'helpers/person'
import { Spend } from 'helpers/spend'
import { useGustavoStore } from 'views/gustavo'
import VenmoLogo from '../../images/venmo-icon.png'

type DebtCalculatorState = {
    person1: Person | undefined
    person2: Person | undefined
}

type DebtCalculatorActions = {
    setPerson1: (person: Person | undefined) => void
    setPerson2: (person: Person | undefined) => void
}

const initialState: DebtCalculatorState = {
    person1: undefined,
    person2: undefined,
}

export const useDebtCalculatorStore = create<DebtCalculatorState & DebtCalculatorActions>(
    (set) => ({
        ...initialState,

        setPerson1: (person: Person | undefined) => {
            set(() => ({ person1: person }))
        },
        setPerson2: (person: Person | undefined) => {
            set(() => ({ person2: person }))
        },
    })
)

export const DebtCalculator = () => {
    const { person1, person2, setPerson1, setPerson2 } = useDebtCalculatorStore(
        useShallow((state) => state)
    )
    const { debtMapByPerson, filteredSpendData } = useGustavoStore(useShallow((state) => state))

    // Debt state and style
    const [debt, setDebt] = useState(0)
    const [debtSpendData, setDebtSpendData] = useState<Spend[]>([])

    useEffect(() => {
        if (person1 && person2) {
            // calculate debt
            const debt = debtMapByPerson.get(person1)?.get(person2) || 0
            setDebt(debt)

            // get spend data between the two people
            const debtFilteredSpendData = filteredSpendData.filter((spend) => {
                if (spend.paidBy === person1) {
                    return (
                        spend.splitBetween.includes(Person.Everyone) ||
                        spend.splitBetween.includes(person2)
                    )
                }
                if (spend.paidBy === person2) {
                    return (
                        spend.splitBetween.includes(Person.Everyone) ||
                        spend.splitBetween.includes(person1)
                    )
                }
            })
            setDebtSpendData(debtFilteredSpendData)
        } else {
            setDebt(0)
            setDebtSpendData([])
        }
    }, [person1, person2, filteredSpendData])

    const debtAbsolute = Math.abs(debt)
    const debtString = FormattedMoney().format(debtAbsolute)

    // Debt person state and style
    const debtPersonWidth = window.innerWidth * 0.3

    const renderDebtPerson = (
        person: Person | undefined,
        setPerson: (person: Person | undefined) => void
    ) => {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                }}>
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
                            boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
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
            </Box>
        )
    }

    const renderVenmoIcon = (person: Person) => {
        return (
            <Link
                href={getVenmoUrl(person)}
                target="_blank"
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                <img
                    src={VenmoLogo}
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: '100%',
                        objectFit: 'cover',
                    }}
                />
            </Link>
        )
    }

    // Select person state and style
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
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onClick={() => {
                    handleSelectPerson(person)
                }}>
                <InitialsIcon
                    person={person}
                    sx={{
                        border: isActive ? '2px solid #FBBC04' : '2px solid white',
                        width: 28,
                        height: 28,
                        fontSize: 14,
                        ...(disabled ? disabledSx : {}),
                    }}
                />
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginX: 1,
                    marginBottom: 1,
                    border: '1px solid #FBBC04',
                    borderRadius: '20px',
                    backgroundColor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                }}>
                {/* Top row */}
                <Box
                    sx={{
                        display: 'flex',
                        paddingY: 1,
                        paddingX: 2,
                    }}>
                    {renderDebtPerson(person1, setPerson1)}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            width: '100%',
                        }}>
                        <Box
                            sx={{
                                height: '100%',
                            }}></Box>
                        {/* Debt amount */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 22,
                                    fontWeight: 'bold',
                                }}>
                                {person1 && person2 && debtString}
                            </Typography>
                            <Box
                                sx={{
                                    height: 28,
                                }}>
                                {debt < 0 &&
                                    getTablerIcon({ name: 'IconHandFingerLeft', size: 28 })}
                                {debt > 0 &&
                                    getTablerIcon({ name: 'IconHandFingerRight', size: 28 })}
                            </Box>
                        </Box>
                        {/* Venmo icons */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                width: '100%',
                                height: '100%',
                            }}>
                            {person1 && person2 && getVenmoUrl(person1) && renderVenmoIcon(person1)}
                            {person1 && person2 && getVenmoUrl(person2) && renderVenmoIcon(person2)}
                        </Box>
                    </Box>
                    {renderDebtPerson(person2, setPerson2)}
                </Box>
                {/* Select person */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 1,
                        borderTop: '1px solid #FBBC04',
                    }}>
                    <Box
                        onClick={() => {
                            setPerson1(undefined)
                            setPerson2(undefined)
                        }}
                        sx={{
                            'display': 'flex',
                            'justifyContent': 'center',
                            'alignItems': 'center',
                            'height': 28,
                            'width': 28,
                            'borderRadius': '100%',
                            '&:active': {
                                backgroundColor: '#FBBC04',
                            },
                            'transition': 'background-color 0.1s',
                        }}>
                        {getTablerIcon({ name: 'IconX' })}
                    </Box>
                    {people.map((person, index) => {
                        return <Box key={index}>{renderSelectPerson(person)}</Box>
                    })}
                </Box>
            </Box>
            <Box
                sx={{
                    maxHeight: window.innerHeight * 0.5,
                    overflowY: 'scroll',
                }}>
                <ReceiptsList spendData={debtSpendData} />
            </Box>
        </Box>
    )
}
