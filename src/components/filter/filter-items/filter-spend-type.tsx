import { create } from 'zustand'

import { Spend, SpendType } from 'helpers/spend'
import { useEffect } from 'react'
import Box from '@mui/material/Box'
import { useShallow } from 'zustand/react/shallow'
import { getIconFromSpendType } from 'components/spend-items/spend-type-icon'
import { ArrowClockwise } from '@phosphor-icons/react'

type FilterSpendTypeState = {
    all: boolean
    filters: Record<SpendType, boolean>
}

type FilterSpendTypeActions = {
    filterBySpendType: (spendData: Spend[]) => Spend[]
    isFilterActive: () => boolean

    setAll: (all: boolean) => void
    setFilters: (filters: Record<SpendType, boolean>) => void
    reset: () => void
}

const initialState: FilterSpendTypeState = {
    all: true,
    filters: {
        [SpendType.Attraction]: false,
        [SpendType.Commute]: false,
        [SpendType.Food]: false,
        [SpendType.Lodging]: false,
        [SpendType.Souvenir]: false,
        [SpendType.Other]: false,
    },
}

export const useFilterSpendTypeStore = create<FilterSpendTypeState & FilterSpendTypeActions>()(
    (set, get) => ({
        ...initialState,

        filterBySpendType: (spendData: Spend[]): Spend[] => {
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

        isFilterActive: () => {
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

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-evenly',
                alignItems: 'center',
                width: '100%',
                fontSize: '14px',
            }}>
            <Box
                sx={{
                    'display': 'flex',
                    'justifyContent': 'center',
                    'alignItems': 'center',
                    'width': 24,
                    'height': 24,
                    'borderRadius': '100%',
                    '&:active': {
                        backgroundColor: '#FBBC04',
                    },
                }}
                onClick={() => {
                    handleAllClick()
                }}>
                <ArrowClockwise size={24} />
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
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: 26,
                                height: 26,
                                backgroundColor: isActive ? '#FBBC04' : 'white',
                                borderRadius: '100%',
                            }}>
                            {getIconFromSpendType(spendType as SpendType, 24)}
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}
