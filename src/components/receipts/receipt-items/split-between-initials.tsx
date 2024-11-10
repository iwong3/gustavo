import { Box, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { useSettingsProfilePicturesStore } from 'components/menu/settings/settings-profile-pictures'
import { InitialsIcon } from 'helpers/icons'
import { getPersonImage, PeopleByTrip, Person } from 'helpers/person'
import { Spend } from 'helpers/spend'
import { Trip } from 'helpers/trips'
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

    // Settings
    const { showProfilePictures } = useSettingsProfilePicturesStore(
        useShallow((state) => state)
    )
    const { showIconLabels } = useSettingsIconLabelsStore(
        useShallow((state) => state)
    )

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
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}>
                                {showProfilePictures &&
                                getPersonImage(person) ? (
                                    <img
                                        src={getPersonImage(person)}
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '100%',
                                            objectFit: 'cover',
                                            filter: isSplitter
                                                ? 'none'
                                                : 'grayscale(100%) brightness(0.75)',
                                        }}
                                    />
                                ) : (
                                    <InitialsIcon
                                        person={person as Person}
                                        sx={{
                                            width: size,
                                            height: size,
                                            ...customSx,
                                        }}
                                    />
                                )}
                                {showIconLabels && (
                                    <Typography sx={{ fontSize: '10px' }}>
                                        {person}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )
                }
            )}
        </Box>
    )
}
