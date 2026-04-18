import { Box, InputAdornment, TextField, Typography } from '@mui/material'
import Fuse from 'fuse.js'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { colors } from '@/lib/colors'
import { useSpendData } from 'providers/spend-data-provider'
import { getTablerIcon } from 'utils/icons'

import type { Expense } from '@/lib/types'

const fuseOptions = {
    keys: [
        { name: 'name', weight: 3 },
        { name: 'locationName', weight: 2 },
        { name: 'paidBy.firstName', weight: 1 },
    ],
    threshold: 0.5,
    distance: 100,
    ignoreLocation: true,
    includeMatches: true,
}

type SearchBarState = {
    searchInput: string
}

type SearchBarActions = {
    search: (spendData: Expense[]) => Expense[]

    setSearchInput: (searchInput: string) => void
    isActive: () => boolean
    reset: () => void
}

const initialState: SearchBarState = {
    searchInput: '',
}

export const useSearchBarStore = create<SearchBarState & SearchBarActions>(
    (set, get) => ({
        ...initialState,

        search: (spendData: Expense[]): Expense[] => {
            const { searchInput } = get()
            if (searchInput === '') {
                return spendData
            }

            const fuse = new Fuse(spendData, fuseOptions)
            const searchResults = fuse.search(searchInput)

            // search results are ordered by relevance, so return spend data with same order
            return searchResults.map((result) => result.item)
        },

        setSearchInput: (searchInput: string) => set({ searchInput }),
        isActive: () => {
            const { searchInput } = get()
            return searchInput !== ''
        },
        reset: () => set(initialState),
    })
)

export const SearchBar = () => {
    const { searchInput, setSearchInput, isActive } = useSearchBarStore(
        useShallow((state) => state)
    )
    const { filteredExpenses, isSearching } = useSpendData()
    const resultCount = isSearching ? filteredExpenses.length : null

    return (
        <Box sx={{ width: '100%' }}>
            <TextField
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search expenses"
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start" sx={{ margin: 0, mr: 0.5 }}>
                                {getTablerIcon({ name: 'IconSearch', size: 16 })}
                            </InputAdornment>
                        ),
                        endAdornment: isActive() && (
                            <InputAdornment
                                position="end"
                                sx={{ margin: 0, gap: 0.75 }}>
                                {resultCount !== null && (
                                    <Typography
                                        sx={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: colors.primaryBrown,
                                            lineHeight: 1,
                                            whiteSpace: 'nowrap',
                                        }}>
                                        {resultCount} result{resultCount === 1 ? '' : 's'}
                                    </Typography>
                                )}
                                <Box
                                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    onClick={() => setSearchInput('')}>
                                    {getTablerIcon({ name: 'IconX', size: 16 })}
                                </Box>
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{
                    width: '100%',
                    '& fieldset': {
                        border: `1px solid ${colors.primaryBlack}`,
                        borderRadius: '4px',
                    },
                    '& .MuiOutlinedInput-root': {
                        height: 36,
                        backgroundColor: colors.primaryWhite,
                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        '&.Mui-focused fieldset': {
                            borderColor: colors.primaryBlack,
                            borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                            borderColor: colors.primaryBlack,
                        },
                    },
                    '& .MuiInputBase-input': {
                        paddingY: 0,
                        paddingX: 0.5,
                        fontSize: 13,
                    },
                    '& .MuiInputBase-root': {
                        paddingLeft: 1.25,
                        paddingRight: 1.25,
                    },
                }}
                fullWidth
            />
        </Box>
    )
}
