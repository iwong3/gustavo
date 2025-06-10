import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { InitialsIcon } from 'utils/icons'
import { PeopleByTrip, Person } from 'utils/person'
import { Spend } from 'utils/spend'
import { Trip } from 'utils/trips'
import { useTripsStore } from 'views/trips'

interface ISplitBetweenInitialsProps {
    spend: Spend
}

export const SplitBetweenInitials = ({ spend }: ISplitBetweenInitialsProps) => {
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    const getInitialStateByTrip = (trip: Trip) => {
        const filters = new Map<Person, boolean>()
        PeopleByTrip[trip].forEach((person) => {
            filters.set(person, false)
        })
        return filters
    }
    const initialState = getInitialStateByTrip(currentTrip)

    const [splitters, setSplitters] =
        useState<Map<Person, boolean>>(initialState)

    useEffect(() => {
        const newSplitters = getInitialStateByTrip(currentTrip)

        if (spend.splitBetween[0] === Person.Everyone) {
            newSplitters.forEach((_, key) => {
                newSplitters.set(key, true)
            })
        } else {
            spend.splitBetween.forEach((person) => {
                newSplitters.set(person, true)
            })
        }

        setSplitters(newSplitters)
    }, [spend])

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 12,
            }}>
            {Array.from(splitters.entries()).map(
                ([person, isSplitter], index) => {
                    const size = 24
                    const customSx = !isSplitter
                        ? { color: 'black', backgroundColor: 'lightgray' }
                        : {}
                    return (
                        <Box
                            key={'split-between-person-' + index}
                            sx={{
                                marginX: 0.75,
                            }}>
                            <InitialsIcon
                                person={person as Person}
                                sx={{ width: size, height: size, ...customSx }}
                            />
                        </Box>
                    )
                }
            )}
        </Box>
    )
}
