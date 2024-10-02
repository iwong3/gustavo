import { create } from 'zustand'

import { Spend, SpendType } from 'helpers/spend'
import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

type FilterSpendTypeState = {
    all: boolean
    filters: Record<SpendType, boolean>

    filterBySpendType: (spendData: Spend[]) => Spend[]

    setAll: (all: boolean) => void
    setFilters: (filters: Record<SpendType, boolean>) => void
}

export const useFilterSpendTypeStore = create<FilterSpendTypeState>((set, get) => ({
    all: true,
    filters: {
        [SpendType.Attraction]: false,
        [SpendType.Commute]: false,
        [SpendType.Food]: false,
        [SpendType.Lodging]: false,
        [SpendType.Other]: false,
        [SpendType.Souvenir]: false,
    },

    filterBySpendType: (spendData: Spend[]): Spend[] => {
        const all = get().all
        const filters = get().filters

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

    setAll: (all: boolean) => set(() => ({ all })),
    setFilters: (filters: Record<SpendType, boolean>) => set(() => ({ filters })),
}))

export const FilterSpendType = () => {
    const all = useFilterSpendTypeStore((state) => state.all)
    const setAll = useFilterSpendTypeStore((state) => state.setAll)
    const filters = useFilterSpendTypeStore((state) => state.filters)
    const setFilters = useFilterSpendTypeStore((state) => state.setFilters)

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
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 24,
                    height: 24,
                    marginLeft: 1,
                    color: 'black',
                    backgroundColor: all ? '#FBBC04' : 'lightgray',
                    borderRadius: '100%',
                }}
                onClick={() => {
                    handleAllClick()
                }}>
                All
            </Box>
            {Object.entries(filters).map(([spendType, isActive]) => {
                return (
                    <Box
                        key={'filter-spend-type-' + spendType}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginLeft: 1,
                        }}
                        onClick={() => {
                            updateFilters(spendType as SpendType)
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                // width: 24,
                                // height: 24,
                                marginLeft: 1,
                                color: 'black',
                                backgroundColor: isActive ? '#FBBC04' : 'lightgray',
                                borderRadius: '100%',
                            }}>
                            {spendType}
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}
