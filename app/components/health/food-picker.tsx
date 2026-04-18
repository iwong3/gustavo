'use client'

import { colors } from '@/lib/colors'
import { fieldSx } from '@/lib/form-styles'
import type { Food } from '@/lib/health-types'
import { Box, Chip, TextField, Typography } from '@mui/material'
import {
    IconChevronDown,
    IconChevronUp,
    IconSearch,
    IconX,
} from '@tabler/icons-react'
import { AlphabetIndex } from 'components/health/alphabet-index'
import Fuse from 'fuse.js'
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

type FoodPickerProps = {
    /** All active foods */
    foods: Food[]
    /** Set of selected food IDs */
    selectedIds: Set<number>
    /** Toggle a food's selection */
    onToggle: (foodId: number) => void
    /** Render a single food row */
    renderItem: (food: Food, isSelected: boolean) => React.ReactNode
    /** Render each selected chip */
    renderChip: (food: Food) => React.ReactNode
    /** Which side the alphabet index appears on */
    alphabetIndexSide: 'left' | 'right'
    /** Search value (controlled externally so parent can reset on open) */
    search: string
    /** Search change handler */
    onSearchChange: (value: string) => void
    /** Accent color for expand/collapse chevron */
    accentColor?: string
    /** Optional content rendered above the search in the sticky header */
    headerContent?: React.ReactNode
}

export function FoodPicker({
    foods,
    selectedIds,
    onToggle,
    renderItem,
    renderChip,
    alphabetIndexSide,
    search,
    onSearchChange,
    headerContent,
    accentColor = '#4caf50',
}: FoodPickerProps) {
    const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
    const selectedChipsRef = useRef<HTMLDivElement>(null)
    const stickyRef = useRef<HTMLDivElement>(null)
    const [stickyHeight, setStickyHeight] = useState(0)
    const [chipsExpanded, setChipsExpanded] = useState(false)
    const [chipsOverflowing, setChipsOverflowing] = useState(false)

    // Fuse.js for fuzzy search
    const fuse = useMemo(
        () => new Fuse(foods, { keys: ['name'], threshold: 0.4 }),
        [foods]
    )

    // Filtered + grouped food list
    const filteredFoods = useMemo(() => {
        if (!search) return foods
        return fuse.search(search).map((r) => r.item)
    }, [foods, search, fuse])

    const foodGroups = useMemo(() => {
        const groups = new Map<string, Food[]>()
        for (const f of filteredFoods) {
            const letter = f.name[0].toUpperCase()
            const arr = groups.get(letter) ?? []
            arr.push(f)
            groups.set(letter, arr)
        }
        return Array.from(groups.entries()).sort((a, b) =>
            a[0].localeCompare(b[0])
        )
    }, [filteredFoods])

    const availableLetters = useMemo(
        () => new Set(foodGroups.map(([letter]) => letter)),
        [foodGroups]
    )

    // Detect overflow on chips container
    useEffect(() => {
        const el = selectedChipsRef.current
        if (el) {
            setChipsOverflowing(el.scrollHeight > el.clientHeight)
        } else {
            setChipsOverflowing(false)
        }
    }, [selectedIds.size, chipsExpanded])

    // Measure sticky header height for alphabet index offset
    useEffect(() => {
        const el = stickyRef.current
        if (el) {
            setStickyHeight(el.offsetHeight)
        } else {
            setStickyHeight(0)
        }
    }, [selectedIds.size, chipsExpanded, search])

    const scrollToLetter = useCallback((letter: string) => {
        const el = sectionRefs.current.get(letter)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])

    const selectedFoods = useMemo(
        () => foods.filter((f) => selectedIds.has(f.id)),
        [foods, selectedIds]
    )

    return (
        <>
            {/* Sticky search + selected summary */}
            <Box
                ref={stickyRef}
                sx={{
                    position: 'sticky',
                    top: -16,
                    zIndex: 2,
                    backgroundColor: colors.primaryWhite,
                    borderBottom:
                        foods.length > 5 || selectedIds.size > 0
                            ? `1px solid ${colors.primaryBlack}15`
                            : 'none',
                    pt: headerContent ? 2 : 0,
                    pb: 1.5,
                    mb: 0.5,
                    mx: -2.5,
                    px: 2.5,
                    ...(headerContent ? { mt: -2 } : {}),
                }}>
                {headerContent}
                {foods.length > 5 && (
                    <TextField
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="Search foods..."
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <IconSearch
                                        size={16}
                                        stroke={2}
                                        color={colors.primaryBrown}
                                        style={{ marginRight: 6 }}
                                    />
                                ),
                                endAdornment: search ? (
                                    <Box
                                        onClick={() => onSearchChange('')}
                                        sx={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                        }}>
                                        <IconX
                                            size={16}
                                            stroke={2}
                                            color={colors.primaryBrown}
                                        />
                                    </Box>
                                ) : null,
                            },
                        }}
                        sx={fieldSx}
                    />
                )}
                {selectedIds.size > 0 && (
                    <Box sx={{ mt: foods.length > 5 ? 1.5 : 0 }}>
                        <Box
                            ref={selectedChipsRef}
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                                maxHeight: chipsExpanded ? 'none' : 60,
                                overflow: 'hidden',
                                transition: 'max-height 0.2s ease',
                            }}>
                            {selectedFoods.map((food) => renderChip(food))}
                        </Box>
                        {(chipsOverflowing || chipsExpanded) && (
                            <Box
                                onClick={() => setChipsExpanded((v) => !v)}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    height: 16,
                                    mt: 0.25,
                                    cursor: 'pointer',
                                    color: accentColor,
                                }}>
                                {chipsExpanded ? (
                                    <IconChevronUp size={14} stroke={2.5} />
                                ) : (
                                    <IconChevronDown size={14} stroke={2.5} />
                                )}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

            {/* Food list + alphabet index */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection:
                        alphabetIndexSide === 'left' ? 'row-reverse' : 'row',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        flex: 1,
                        minWidth: 0,
                    }}>
                    {foodGroups.map(([letter, letterFoods], gi) => (
                        <Box key={letter}>
                            <Typography
                                ref={(el) => {
                                    if (el)
                                        sectionRefs.current.set(letter, el)
                                    else sectionRefs.current.delete(letter)
                                }}
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: colors.primaryBrown,
                                    px: 0.5,
                                    pt: gi === 0 ? 0 : 1,
                                    pb: 0.5,
                                    scrollMarginTop: `${stickyHeight + 8}px`,
                                }}>
                                {letter}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                }}>
                                {letterFoods.map((food) =>
                                    renderItem(
                                        food,
                                        selectedIds.has(food.id)
                                    )
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
                {!search && (
                    <AlphabetIndex
                        availableLetters={availableLetters}
                        onSelect={scrollToLetter}
                        topOffset={stickyHeight}
                        side={alphabetIndexSide}
                    />
                )}
            </Box>
        </>
    )
}
