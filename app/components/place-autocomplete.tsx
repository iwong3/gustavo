'use client'

import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { IconMapPin, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'
import type { PlaceDetails, PlacePrediction } from '@/lib/types'
import {
    adornedFieldSx,
    dropdownMenuItemSx,
    dropdownPaperSx,
} from '@/lib/form-styles'
import { searchPlaces, getPlaceDetails } from 'utils/api'

type Props = {
    value: PlaceDetails | null
    onChange: (place: PlaceDetails | null) => void
}

export default function PlaceAutocomplete({ value, onChange }: Props) {
    const [inputValue, setInputValue] = useState('')
    const [options, setOptions] = useState<PlacePrediction[]>([])
    const [loading, setLoading] = useState(false)
    const sessionTokenRef = useRef(crypto.randomUUID())
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    // Sync input display with external value
    useEffect(() => {
        if (value) {
            setInputValue(value.name)
        } else {
            setInputValue('')
        }
    }, [value])

    const fetchPredictions = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (query.trim().length < 2) {
            setOptions([])
            return
        }

        setLoading(true)
        debounceRef.current = setTimeout(async () => {
            const results = await searchPlaces(query, sessionTokenRef.current)
            setOptions(results)
            setLoading(false)
        }, 300)
    }, [])

    const handleSelect = async (_: unknown, prediction: string | PlacePrediction | null) => {
        if (!prediction || typeof prediction === 'string') {
            onChange(null)
            return
        }

        const details = await getPlaceDetails(prediction.placeId)
        if (details) {
            onChange(details)
        }
        // Reset session token for next search session
        sessionTokenRef.current = crypto.randomUUID()
    }

    const handleClear = () => {
        onChange(null)
        setOptions([])
        sessionTokenRef.current = crypto.randomUUID()
    }

    // When a place is selected, show it as a chip-like display instead of the autocomplete
    if (value) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8.5px 14px',
                    minHeight: '48px',
                    backgroundColor: colors.primaryWhite,
                    border: `1px solid ${colors.primaryBlack}`,
                    borderRadius: '4px',
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconMapPin size={16} color={colors.primaryBlack} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                        {value.name}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 11,
                            color: 'text.secondary',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                        {value.address}
                    </Typography>
                </Box>
                <Box
                    onClick={handleClear}
                    sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                    }}>
                    <IconX size={16} color={colors.primaryBlack} />
                </Box>
            </Box>
        )
    }

    return (
        <Autocomplete
            freeSolo
            options={options}
            getOptionLabel={(opt) =>
                typeof opt === 'string' ? opt : opt.name
            }
            filterOptions={(x) => x} // Don't filter client-side — server handles it
            loading={loading}
            inputValue={inputValue}
            onInputChange={(_, val, reason) => {
                if (reason === 'input') {
                    setInputValue(val)
                    fetchPredictions(val)
                }
            }}
            onChange={handleSelect}
            disablePortal
            size="small"
            slotProps={{
                listbox: {
                    sx: {
                        'maxHeight': 240,
                        '& .MuiAutocomplete-option': dropdownMenuItemSx,
                    },
                },
                paper: {
                    sx: dropdownPaperSx,
                },
            }}
            renderOption={(props, option) => {
                if (typeof option === 'string') return null
                const { key, ...rest } = props
                return (
                    <li key={key} {...rest}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
                            <IconMapPin size={16} color={colors.primaryBlack} style={{ marginTop: 2, flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                                    {option.name}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
                                    {option.address}
                                </Typography>
                            </Box>
                        </Box>
                    </li>
                )
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="Search places..."
                    sx={{
                        ...adornedFieldSx,
                        // Autocomplete injects its own padding — override to match selected chip
                        '& .MuiAutocomplete-inputRoot': {
                            padding: '8.5px 14px !important',
                            gap: '6px',
                            minHeight: '48px',
                        },
                        '& .MuiAutocomplete-input': {
                            padding: '0 !important',
                        },
                    }}
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <Box
                                component="span"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                <IconMapPin
                                    size={16}
                                    color={colors.primaryBlack}
                                />
                            </Box>
                        ),
                    }}
                />
            )}
        />
    )
}
