import { Box, Link, Typography } from '@mui/material'
import { UserCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useWindowSize } from 'hooks/useWindowSize'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { ReceiptsList } from 'components/receipts/receipts-list'
import { defaultBackgroundColor } from 'utils/colors'
import { FormattedMoney } from 'utils/currency'
import { getTablerIcon, InitialsIcon } from 'utils/icons'
import { useSpendData } from 'providers/spend-data-provider'

import type { Expense, UserSummary } from '@/lib/types'

type DebtCalculatorState = {
    person1: number | undefined
    person2: number | undefined
}

type DebtCalculatorActions = {
    setPerson1: (person: number | undefined) => void
    setPerson2: (person: number | undefined) => void
    reset: () => void
}

const initialState: DebtCalculatorState = {
    person1: undefined,
    person2: undefined,
}

export const useDebtCalculatorStore = create<
    DebtCalculatorState & DebtCalculatorActions
>((set) => ({
    ...initialState,

    setPerson1: (person: number | undefined) => {
        set(() => ({ person1: person }))
    },
    setPerson2: (person: number | undefined) => {
        set(() => ({ person2: person }))
    },
    reset: () => {
        set(() => ({ ...initialState }))
    },
}))

export const DebtCalculator = () => {
    const { person1, person2, setPerson1, setPerson2 } = useDebtCalculatorStore(
        useShallow((state) => state)
    )
    const { debtMap, filteredExpenses, participants } = useSpendData()

    const participantById = new Map<number, UserSummary>()
    for (const p of participants) {
        participantById.set(p.id, p)
    }

    const person1Data = person1 != null ? participantById.get(person1) : undefined
    const person2Data = person2 != null ? participantById.get(person2) : undefined

    // Debt state and style
    const [debt, setDebt] = useState(0)
    const [debtExpenses, setDebtExpenses] = useState<Expense[]>([])

    useEffect(() => {
        if (person1 != null && person2 != null) {
            const debt = debtMap.get(person1)?.get(person2) || 0
            setDebt(debt)

            const debtFiltered = filteredExpenses.filter((exp) => {
                if (exp.paidBy.id === person1) {
                    return (
                        exp.isEveryone ||
                        exp.splitBetween.some((u) => u.id === person2)
                    )
                }
                if (exp.paidBy.id === person2) {
                    return (
                        exp.isEveryone ||
                        exp.splitBetween.some((u) => u.id === person1)
                    )
                }
                return false
            })
            setDebtExpenses(debtFiltered)
        } else {
            setDebt(0)
            setDebtExpenses([])
        }
    }, [person1, person2, filteredExpenses, debtMap])

    const debtAbsolute = Math.abs(debt)
    const debtString = FormattedMoney().format(debtAbsolute)

    // Debt person state and style
    const { width: windowWidth } = useWindowSize()
    const debtPersonWidth = (windowWidth || 390) * 0.3

    const renderDebtPerson = (
        personId: number | undefined,
        personData: UserSummary | undefined,
        setPersonId: (person: number | undefined) => void
    ) => {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                <Box
                    onClick={() => {
                        setPersonId(undefined)
                    }}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: debtPersonWidth,
                        height: debtPersonWidth,
                    }}>
                    <InitialsIcon
                        name={personData?.firstName ?? ''}
                        initials={personData?.initials}
                        sx={{
                            width: personData ? 100 : 0,
                            height: personData ? 100 : 0,
                            fontSize: 32,
                            opacity: personData ? 1 : 0,
                            transition: 'opacity 0.2s ease-out',
                            boxShadow:
                                'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                        }}
                    />
                    <UserCircle
                        weight="duotone"
                        color="#495057"
                        style={{
                            width: personData ? 0 : 120,
                            height: personData ? 0 : 120,
                            opacity: personData ? 0 : 1,
                            transition: 'opacity 0.2s ease-out',
                        }}
                    />
                </Box>
            </Box>
        )
    }

    const handleSelectPerson = (userId: number) => {
        if (userId === person1) {
            setPerson1(undefined)
        } else if (userId === person2) {
            setPerson2(undefined)
        } else if (person1 == null) {
            setPerson1(userId)
        } else if (person2 == null) {
            setPerson2(userId)
        }
    }

    const renderSelectPerson = (participant: UserSummary) => {
        const isActive = participant.id === person1 || participant.id === person2
        const disabled =
            person1 != null && person2 != null && participant.id !== person1 && participant.id !== person2
        const disabledSx = { color: 'black', backgroundColor: 'lightgray' }

        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onClick={() => {
                    handleSelectPerson(participant.id)
                }}>
                <InitialsIcon
                    name={participant.firstName}
                    initials={participant.initials}
                    sx={{
                        border: isActive
                            ? '2px solid #FBBC04'
                            : '2px solid #FFFFEF',
                        width: 28,
                        height: 28,
                        fontSize: 14,
                        ...(disabled ? disabledSx : {}),
                    }}
                />
            </Box>
        )
    }

    // Venmo icons
    const renderVenmoIcon = (personData: UserSummary) => {
        return (
            <Link
                href={personData.venmoUrl ?? ''}
                target="_blank"
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
            </Link>
        )
    }

    const showVenmoPerson1 = person1Data && person2Data && person1Data.venmoUrl
    const showVenmoPerson2 = person1Data && person2Data && person2Data.venmoUrl
    const showVenmoBoth = showVenmoPerson1 && showVenmoPerson2

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
                    backgroundColor: defaultBackgroundColor,
                    boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                }}>
                {/* Top row */}
                <Box
                    sx={{
                        display: 'flex',
                        paddingY: 1,
                        paddingX: 2,
                    }}>
                    {renderDebtPerson(person1, person1Data, setPerson1)}
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
                                {person1 != null && person2 != null && debtString}
                            </Typography>
                            <Box
                                sx={{
                                    height: 28,
                                }}>
                                {debt < 0 &&
                                    getTablerIcon({
                                        name: 'IconHandFingerLeft',
                                        size: 28,
                                    })}
                                {debt > 0 &&
                                    getTablerIcon({
                                        name: 'IconHandFingerRight',
                                        size: 28,
                                    })}
                            </Box>
                        </Box>
                        {/* Venmo icons */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: showVenmoBoth
                                    ? 'space-between'
                                    : showVenmoPerson1
                                    ? 'flex-start'
                                    : 'flex-end',
                                alignItems: 'flex-end',
                                width: '100%',
                                height: '100%',
                            }}>
                            {showVenmoPerson1 && renderVenmoIcon(person1Data)}
                            {showVenmoPerson2 && renderVenmoIcon(person2Data)}
                        </Box>
                    </Box>
                    {renderDebtPerson(person2, person2Data, setPerson2)}
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
                            'marginRight': 1,
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
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-evenly',
                            alignItems: 'center',
                            width: '100%',
                        }}>
                        {participants.map((participant, index) => {
                            return (
                                <Box key={index}>
                                    {renderSelectPerson(participant)}
                                </Box>
                            )
                        })}
                    </Box>
                </Box>
            </Box>
            <Box
                sx={{
                    maxHeight: '50svh',
                    overflowY: 'scroll',
                }}>
                <ReceiptsList expenses={debtExpenses} />
            </Box>
        </Box>
    )
}
