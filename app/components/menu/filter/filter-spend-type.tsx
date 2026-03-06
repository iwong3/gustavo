import { Box, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import {
    getColorForCategory,
    getIconFromCategory,
    getTablerIcon,
} from 'utils/icons'

type FilterSpendTypeState = {
    filters: Map<string, boolean> // categoryName → boolean
}

type FilterSpendTypeActions = {
    handleFilterClick: (category: string) => void
    isActive: () => boolean
    setFilters: (filters: Map<string, boolean>) => void
    reset: (categories: string[]) => void
}

const initialState: FilterSpendTypeState = {
    filters: new Map<string, boolean>(),
}

const filtersFromNames = (categories: string[]) => {
    const filters = new Map<string, boolean>()
    categories.forEach((c) => filters.set(c, false))
    return filters
}

export const useFilterSpendTypeStore = create<
    FilterSpendTypeState & FilterSpendTypeActions
>()((set, get) => ({
    ...initialState,

    handleFilterClick: (category: string) => {
        const { filters } = get()
        const newFilters = new Map(filters)
        newFilters.set(category, !newFilters.get(category))
        set(() => ({ filters: newFilters }))
    },

    isActive: () => {
        const { filters } = get()
        return Array.from(filters.values()).includes(true)
    },
    setFilters: (filters: Map<string, boolean>) => set(() => ({ filters })),
    reset: (categories: string[]) => {
        set(() => ({ filters: filtersFromNames(categories) }))
    },
}))

export const FilterSpendType = ({
    categories,
}: {
    categories: string[]
}) => {
    const { filters, handleFilterClick, setFilters } = useFilterSpendTypeStore(
        useShallow((state) => state)
    )

    const resetAllFilters = () => {
        const newFilters = new Map(filters)
        Array.from(newFilters.keys()).forEach((key) => {
            newFilters.set(key, false)
        })
        setFilters(newFilters)
    }

    const { showIconLabels } = useSettingsIconLabelsStore(
        useShallow((state) => state)
    )

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginX: 2,
                width: '100%',
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
                        resetAllFilters()
                    }}>
                    {getTablerIcon({ name: 'IconX' })}
                </Box>
                {showIconLabels && (
                    <Typography sx={{ fontSize: '10px' }}>Clear</Typography>
                )}
            </Box>
            {Array.from(filters.entries()).map(([category, isActive]) => {
                return (
                    <Box
                        key={'filter-spend-type-' + category}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onClick={() => {
                            handleFilterClick(category)
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
                                    backgroundColor: isActive
                                        ? getColorForCategory(category)
                                        : 'white',
                                    transition: 'background-color 0.1s',
                                }}>
                                {getIconFromCategory(category)}
                            </Box>
                            {showIconLabels && (
                                <Typography sx={{ fontSize: '10px' }}>
                                    {category}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}
