'use client'

import { Box, Typography } from '@mui/material'

import { colors } from '@/lib/colors'
import { fieldShadow } from '@/lib/form-styles'
import { getColorForCategory, getIconFromCategory } from 'utils/icons'

// One row per category, always visible.
//
// Replaces a search-dropdown that cost 2+ taps and, worse, hid Google's inferred
// category behind a filled-in field — you couldn't tell a guess from your own
// choice. Here the guess is simply selected, badged AUTO, and one tap fixes it.
//
// One column (rather than a grid) because categories are user-editable: a grid
// has to truncate long custom names, a list never does.

export type PickerCategory = {
    id: number
    name: string
    /** Times used on this trip — shown right-aligned. */
    count: number
}

/** Shorter than the 42px split rows above it in the form: a category row carries
 *  an icon and a word, not an avatar + tag + Treat pill. Full-bleed rows keep
 *  the tap target forgiving despite the height. */
const ROW_HEIGHT = 32

interface CategoryPickerProps {
    categories: PickerCategory[]
    value: number | ''
    onChange: (id: number | '') => void
    /** True while the categories query is in flight — without a placeholder the
     *  empty list collapses the container to a 2px hollow box. */
    isPending?: boolean
    /** Google inferred this one: badge it and tint the container, matching the
     *  blue prefill convention used by the name field. */
    isAutoFilled?: boolean
}

export const CategoryPicker = ({
    categories,
    value,
    onChange,
    isPending = false,
    isAutoFilled = false,
}: CategoryPickerProps) => (
    <Box
        sx={{
            backgroundColor: colors.primaryWhite,
            border: `1px solid ${isAutoFilled ? colors.primaryBlue : colors.primaryBlack}`,
            borderRadius: '4px',
            boxShadow: isAutoFilled ? `2px 2px 0px ${colors.primaryBlue}` : fieldShadow,
            overflow: 'hidden',
            transition: 'border-color 0.15s, box-shadow 0.15s',
        }}>
        {categories.length === 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', height: ROW_HEIGHT, paddingX: '10px' }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {isPending ? 'Loading categories…' : 'No categories available'}
                </Typography>
            </Box>
        )}

        {categories.map((c, i) => {
            const selected = c.id === value
            return (
                <Box
                    key={c.id}
                    onClick={() => onChange(selected ? '' : c.id)}
                    role="button"
                    aria-pressed={selected}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        height: ROW_HEIGHT,
                        paddingX: '10px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: selected ? colors.primaryYellow : 'transparent',
                        borderBottom:
                            i < categories.length - 1
                                ? `1px solid ${colors.primaryBlack}15`
                                : 'none',
                        transition: 'background-color 0.15s',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: getColorForCategory(c.name),
                            flexShrink: 0,
                        }}>
                        {getIconFromCategory(c.name, 12)}
                    </Box>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: selected ? 700 : 400,
                            color: colors.primaryBlack,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                        }}>
                        {c.name}
                    </Typography>

                    {/* Right slot: AUTO on Google's guess, else this trip's usage count */}
                    {selected && isAutoFilled ? (
                        <Box
                            sx={{
                                marginLeft: 'auto',
                                flexShrink: 0,
                                fontSize: 9,
                                fontWeight: 800,
                                letterSpacing: '0.5px',
                                lineHeight: 1,
                                padding: '3px 5px',
                                borderRadius: '3px',
                                border: `1px solid ${colors.primaryBlack}`,
                                backgroundColor: colors.primaryBlue,
                                color: colors.primaryWhite,
                            }}>
                            AUTO
                        </Box>
                    ) : (
                        c.count > 0 && (
                            <Typography
                                sx={{
                                    marginLeft: 'auto',
                                    flexShrink: 0,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                }}>
                                {c.count}
                            </Typography>
                        )
                    )}
                </Box>
            )
        })}
    </Box>
)
