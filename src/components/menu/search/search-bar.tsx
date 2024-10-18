import { Box, ClickAwayListener, InputAdornment, TextField } from '@mui/material'
import Fuse from 'fuse.js'
import { useState } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useCollapseAllStore } from 'components/menu/items/collapse-all'
import { getTablerIcon } from 'helpers/icons'
import { Spend } from 'helpers/spend'

const fuseOptions = {
    // matches Spend interface
    keys: [
        {
            name: 'name',
            weight: 1,
        },
        {
            name: 'date',
            weight: 1,
        },
        {
            name: 'paidBy',
            weight: 1,
        },
        {
            name: 'location',
            weight: 1,
        },
    ],
    includeMatches: true,
}

type SearchBarState = {
    searchInput: string
}

type SearchBarActions = {
    search: (spendData: Spend[]) => Spend[]

    setSearchInput: (searchInput: string) => void
    isActive: () => boolean
}

const initialState: SearchBarState = {
    searchInput: '',
}

export const useSearchBarStore = create<SearchBarState & SearchBarActions>((set, get) => ({
    ...initialState,

    search: (spendData: Spend[]): Spend[] => {
        const { searchInput } = get()
        if (searchInput === '') {
            return spendData
        }

        const fuse = new Fuse(spendData, fuseOptions)
        const searchResults = fuse.search(searchInput)

        // search results are ordered by relevance, so return spend data with same order
        const searchResultsIndexes = searchResults.map((result) => result.refIndex)
        const searchedAndOrderedSpendData = searchResultsIndexes.map((index) => spendData[index])

        return searchedAndOrderedSpendData
    },

    setSearchInput: (searchInput: string) => set({ searchInput }),
    isActive: () => {
        const { searchInput } = get()
        return searchInput !== ''
    },
}))

export const SearchBar = () => {
    const { searchInput, setSearchInput, isActive } = useSearchBarStore(
        useShallow((state) => state)
    )
    const { toggle: collapseAll } = useCollapseAllStore(useShallow((state) => state))

    const [focused, setFocused] = useState(false)

    return (
        <ClickAwayListener
            onClickAway={() => {
                if (!isActive()) {
                    setFocused(false)
                }
            }}>
            <Box
                onClick={() => setFocused(true)}
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: focused || isActive() ? '50%' : '32px',
                    height: '32px',
                    transition: 'width 0.1s ease-out',
                }}>
                <TextField
                    value={searchInput}
                    onChange={(e) => {
                        setSearchInput(e.target.value)
                        collapseAll()
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment
                                    position="start"
                                    sx={{
                                        margin: 0,
                                    }}>
                                    {getTablerIcon({ name: 'IconSearch', size: 16 })}
                                </InputAdornment>
                            ),
                            endAdornment: isActive() && (
                                <InputAdornment
                                    position="end"
                                    sx={{
                                        margin: 0,
                                    }}
                                    onClick={() => {
                                        setSearchInput('')
                                        setFocused(false)
                                        collapseAll()
                                    }}>
                                    {getTablerIcon({ name: 'IconX', size: 16 })}
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{
                        // whole component
                        '& fieldset': {
                            border: '1px solid #FBBC04',
                            borderRadius: '10px',
                            backgroundColor: 'white',
                            zIndex: -1,
                        },
                        // whole component when focused
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                                borderColor: '#FBBC04',
                            },
                        },
                        // text input
                        '& .MuiInputBase-input': {
                            paddingY: 1,
                            paddingX: 0.5,
                            height: 14,
                            fontSize: 12,
                        },
                        // start adornment
                        '& .MuiInputBase-root': {
                            paddingLeft: 1,
                            paddingRight: 1,
                        },
                    }}
                    fullWidth
                />
            </Box>
        </ClickAwayListener>
    )
}
