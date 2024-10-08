import { Box, Typography } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { getIconFromSpendType, getTablerIcon } from 'helpers/icons'
import { Spend, SpendType } from 'helpers/spend'

type FilterSpendTypeState = {
    all: boolean
    filters: Record<SpendType, boolean>
}

type FilterSpendTypeActions = {
    filter: (spendData: Spend[]) => Spend[]
    isActive: () => boolean

    setAll: (all: boolean) => void
    setFilters: (filters: Record<SpendType, boolean>) => void
    reset: () => void
}

const initialState: FilterSpendTypeState = {
    all: true,
    filters: {
        [SpendType.Attraction]: false,
        [SpendType.Food]: false,
        [SpendType.Lodging]: false,
        [SpendType.Shopping]: false,
        [SpendType.Transit]: false,
        [SpendType.Other]: false,
    },
}

export const useFilterSpendTypeStore = create<FilterSpendTypeState & FilterSpendTypeActions>()(
    (set, get) => ({
        ...initialState,

        filter: (spendData: Spend[]): Spend[] => {
            const { all, filters } = get()

            if (all) {
                return spendData
            }

            const filteredSpendData = spendData.filter((spend) => {
                if (spend.type === undefined) {
                    if (filters[SpendType.Other]) {
                        return true
                    }
                    return false
                }
                return filters[spend.type]
            })
            return filteredSpendData
        },

        isActive: () => {
            const { all } = get()
            return !all
        },

        setAll: (all: boolean) => set(() => ({ all })),
        setFilters: (filters: Record<SpendType, boolean>) => set(() => ({ filters })),
        reset: () => set(initialState),
    })
)

export const FilterSpendType = () => {
    const { all, filters, setAll, setFilters } = useFilterSpendTypeStore(
        useShallow((state) => state)
    )

    useEffect(() => {
        if (Object.values(filters).every((filter) => !filter)) {
            setAll(true)
        } else {
            setAll(false)
        }
    }, [filters])

    const handleAllClick = () => {
        if (!all) {
            setAll(true)
            setFilters(
                Object.keys(filters).reduce((acc, key) => {
                    acc[key as SpendType] = false
                    return acc
                }, {} as Record<SpendType, boolean>)
            )
        }
    }

    const updateFilters = (type: SpendType) => {
        setFilters({
            ...filters,
            [type]: !filters[type],
        })
    }

    // settings stores
    const { showIconLabels } = useSettingsIconLabelsStore()

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginX: 2,
                width: '100%',
                border: '1px solid white',
                borderBottomWidth: 0,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                <Box
                    sx={{
                        'display': 'flex',
                        'justifyContent': 'center',
                        'alignItems': 'center',
                        'borderRadius': '100%',
                        '&:active': {
                            backgroundColor: '#FBBC04',
                        },
                        'transition': 'background-color 0.1s',
                    }}
                    onClick={() => {
                        handleAllClick()
                    }}>
                    {getTablerIcon({ name: 'IconX' })}
                </Box>
                {showIconLabels && <Typography sx={{ fontSize: '10px' }}>Clear</Typography>}
            </Box>
            {Object.entries(filters).map(([spendType, isActive]) => {
                return (
                    <Box
                        key={'filter-spend-type-' + spendType}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onClick={() => {
                            updateFilters(spendType as SpendType)
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: '100%',
                                    backgroundColor: isActive ? '#FBBC04' : 'white',
                                    transition: 'background-color 0.1s',
                                }}>
                                {getIconFromSpendType(spendType as SpendType)}
                            </Box>
                            {showIconLabels && (
                                <Typography sx={{ fontSize: '10px' }}>{spendType}</Typography>
                            )}
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}
