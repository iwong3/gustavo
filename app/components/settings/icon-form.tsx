'use client'

import { Box, TextField, Typography } from '@mui/material'
import { IconCheck, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import { colors, pressIconSx } from '@/lib/colors'
import { fieldSx, labelSx } from '@/lib/form-styles'
import { AnimatedHeight } from 'components/animated-height'
import { FormPage } from 'components/form-page'
import { deriveInitials, getContrastText, InitialsIcon } from 'utils/icons'

/** Preset icon colors — one tap each; the last swatch opens the full picker. */
export const ICON_SWATCHES = [
    '#fbbc04',
    '#f7cd83',
    '#ff8a65',
    '#f48fb1',
    '#ce93d8',
    '#9fa8da',
    '#81d4fa',
    '#80cbc4',
    '#a5d6a7',
    '#dce775',
    '#bcaaa4',
] as const
const DEFAULT_COLOR = ICON_SWATCHES[0]

const swatchSx = {
    aspectRatio: '1',
    borderRadius: '50%',
    border: `1px solid ${colors.primaryBlack}`,
    boxShadow: `1.5px 1.5px 0 ${colors.primaryBlack}`,
    padding: 0,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    ...pressIconSx,
} as const

/**
 * Your icon: initials + color, with a live preview. A page-style form
 * (Settings → tap your avatar), replacing the old dialog.
 */
export function IconForm({
    name,
    initials,
    iconColor,
    onSave,
    onCancel,
}: {
    name: string
    initials: string | null
    iconColor: string | null
    onSave: (initials: string, color: string) => Promise<void>
    onCancel: () => void
}) {
    const [editInitials, setEditInitials] = useState(initials || deriveInitials(name))
    const [editColor, setEditColor] = useState(iconColor || DEFAULT_COLOR)
    const isPreset = (ICON_SWATCHES as readonly string[]).includes(editColor.toLowerCase())
    // The full picker opens with a custom color already in use
    const [customOpen, setCustomOpen] = useState(!isPreset)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | undefined>()

    const handleSave = async () => {
        if (!editInitials.trim()) {
            setError('Add at least one letter.')
            return
        }
        setSaving(true)
        setError(undefined)
        try {
            await onSave(editInitials.trim().toUpperCase(), editColor)
        } catch {
            setError("Couldn't save your icon. Try again.")
            setSaving(false)
        }
    }

    return (
        <FormPage
            title="Your icon"
            error={error}
            onCancel={onCancel}
            onSubmit={handleSave}
            busy={saving}
            submitLabel={saving ? 'Saving...' : 'Save'}>
            <Box sx={{ display: 'flex', justifyContent: 'center', paddingY: 1 }}>
                <InitialsIcon
                    name={name}
                    initials={editInitials || undefined}
                    iconColor={editColor}
                    sx={{
                        width: 88,
                        height: 88,
                        fontSize: 34,
                        border: `2px solid ${colors.primaryBlack}`,
                        boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                    }}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Initials</Typography>
                <TextField
                    value={editInitials}
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/\s/g, '')
                        if (val.length <= 3) setEditInitials(val)
                        setError(undefined)
                    }}
                    size="small"
                    fullWidth
                    autoComplete="off"
                    slotProps={{ htmlInput: { maxLength: 3, style: { fontWeight: 700, letterSpacing: 2 } } }}
                    sx={fieldSx}
                />
                <Typography sx={{ fontSize: 12, color: 'text.secondary', marginTop: 0.5 }}>
                    Up to 3 letters.
                </Typography>
            </Box>

            <Box>
                <Typography sx={labelSx}>Color</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.25, paddingTop: 0.5 }}>
                    {ICON_SWATCHES.map((c) => (
                        <Box
                            key={c}
                            component="button"
                            type="button"
                            aria-label={`Color ${c}`}
                            aria-pressed={editColor.toLowerCase() === c}
                            onClick={() => {
                                setEditColor(c)
                                setCustomOpen(false)
                            }}
                            sx={{ ...swatchSx, backgroundColor: c }}>
                            {editColor.toLowerCase() === c && (
                                <IconCheck size={20} stroke={3} color={getContrastText(c)} />
                            )}
                        </Box>
                    ))}
                    {/* Custom: a rainbow +, or the custom color with the
                        check once one is picked */}
                    <Box
                        component="button"
                        type="button"
                        aria-label="Custom color"
                        aria-pressed={!isPreset}
                        onClick={() => setCustomOpen((o) => !o)}
                        sx={{
                            ...swatchSx,
                            background: isPreset
                                ? 'conic-gradient(#f44336, #ffeb3b, #4caf50, #03a9f4, #9c27b0, #f44336)'
                                : editColor,
                        }}>
                        {isPreset ? (
                            <IconPlus size={16} stroke={2.6} color={colors.primaryWhite} />
                        ) : (
                            <IconCheck size={20} stroke={3} color={getContrastText(editColor)} />
                        )}
                    </Box>
                </Box>
                <AnimatedHeight>
                    {customOpen && (
                        <Box
                            sx={{
                                'paddingTop': 2,
                                '& .react-colorful': {
                                    width: '100%',
                                    height: 180,
                                    borderRadius: 1,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                },
                                '& .react-colorful__saturation': {
                                    borderRadius: '4px 4px 0 0',
                                    borderBottom: `1px solid ${colors.primaryBlack}`,
                                },
                                '& .react-colorful__hue': { borderRadius: '0 0 4px 4px', height: 20 },
                                '& .react-colorful__pointer': {
                                    width: 20,
                                    height: 20,
                                    border: `2px solid ${colors.primaryBlack}`,
                                },
                            }}>
                            <HexColorPicker color={editColor} onChange={setEditColor} />
                        </Box>
                    )}
                </AnimatedHeight>
            </Box>
        </FormPage>
    )
}
