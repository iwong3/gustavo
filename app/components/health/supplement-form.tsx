'use client'

import { Box, Checkbox, TextField, Typography } from '@mui/material'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { colors, hardShadow, pressRowSx } from '@/lib/colors'
import {
    errorFieldSx,
    errorLabelSx,
    fieldSx,
    labelSx,
} from '@/lib/form-styles'
import type { Supplement } from '@/lib/health-types'
import { MAX_DAILY_DOSES } from '@/lib/health/supplement-stack'
import { queryKeys } from '@/lib/query-keys'
import { FormPage } from 'components/form-page'
import { logDateString } from 'utils/time'

type Props = {
    mode: 'add' | 'edit'
    supplement?: Supplement
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style New / Edit Supplement form: name, dosage, how many times a day
 * it's in your daily stack (the home page's check-off card), and (when
 * editing) an Active toggle — inactive supplements stay in history but drop
 * out of the log checklist and the stack. Owns the request; the page owns navigation.
 */
export default function SupplementForm({
    mode,
    supplement,
    onCancel,
    onSuccess,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [name, setName] = useState(supplement?.name ?? '')
    const [dosage, setDosage] = useState(supplement?.dosage ?? '')
    const [isActive, setIsActive] = useState(supplement?.isActive ?? true)
    // Doses/day in the daily stack; 0 = as needed (not in the stack)
    const [daily, setDaily] = useState(supplement?.dailyDoses ?? 0)
    const [attempted, setAttempted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const nameError = attempted && !name.trim()

    const handleSubmit = useCallback(async () => {
        setAttempted(true)
        if (!name.trim()) {
            setError('Give the supplement a name.')
            return
        }
        setError('')
        setSaving(true)
        try {
            const url =
                isEdit && supplement
                    ? `/api/health/supplements/${supplement.id}`
                    : '/api/health/supplements'
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    dosage: dosage.trim() || null,
                    dailyDoses: daily === 0 ? null : daily,
                    // The day any stack change (start/stop/dose) is dated
                    eventDate: logDateString(),
                    ...(isEdit ? { isActive } : {}),
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.error || 'Could not save the supplement.')
                return
            }
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.supplements,
            })
            // A save can start/stop/change the stack (calendar + Day X)
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.supplementEvents,
            })
            onSuccess()
        } catch (err) {
            console.error('Failed to save supplement:', err)
            setError('Could not save the supplement. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [name, dosage, daily, isActive, isEdit, supplement, queryClient, onSuccess])

    return (
        <FormPage
            title={isEdit ? 'Edit Supplement' : 'New Supplement'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving}
            submitLabel={saving ? 'Saving...' : isEdit ? 'Save' : 'Add'}>
            <Box>
                <Typography sx={nameError ? errorLabelSx : labelSx}>
                    Name *
                </Typography>
                <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    size="small"
                    fullWidth
                    autoFocus={!isEdit}
                    placeholder="Creatine, Vitamin D..."
                    sx={nameError ? errorFieldSx : fieldSx}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Dosage</Typography>
                <TextField
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="5g, 400mg, 2 capsules..."
                    sx={fieldSx}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Daily stack</Typography>
                <DosesStepper value={daily} onChange={setDaily} />
                <Typography sx={{ fontSize: 12, color: colors.primaryBrown, marginTop: 0.75 }}>
                    How many times a day you take it — daily ones get a check-off
                    on Home. Tap − down to 0 for as needed.
                </Typography>
            </Box>

            {isEdit && (
                <Box
                    onClick={() => setIsActive(!isActive)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                    }}>
                    <Checkbox
                        checked={isActive}
                        size="small"
                        sx={{
                            'padding': 0,
                            'color': colors.primaryBlack,
                            '&.Mui-checked': { color: colors.primaryBlack },
                        }}
                        tabIndex={-1}
                    />
                    <Typography sx={{ fontSize: 14 }}>Active</Typography>
                </Box>
            )}
        </FormPage>
    )
}

/** − value + for doses/day: 0 reads "As needed", 1–MAX reads "2× a day".
 *  No keyboard, nothing to clear; the ends just stop. */
function DosesStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    const step = (d: number) => onChange(Math.min(MAX_DAILY_DOSES, Math.max(0, value + d)))
    const button = (label: string, d: number, icon: React.ReactNode) => {
        const disabled = d < 0 ? value === 0 : value === MAX_DAILY_DOSES
        return (
            <Box
                component="button"
                type="button"
                aria-label={label}
                disabled={disabled}
                onClick={() => step(d)}
                sx={{
                    display: 'grid',
                    placeItems: 'center',
                    height: '100%',
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: disabled ? 'default' : 'pointer',
                    color: disabled ? colors.primaryBrown : colors.primaryBlack,
                    opacity: disabled ? 0.35 : 1,
                    ...(disabled ? {} : pressRowSx),
                }}>
                {icon}
            </Box>
        )
    }
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 44px',
                alignItems: 'center',
                // Sized to its longest reading ("As needed / not in the daily
                // stack") — full width looked empty around "2×"
                width: 224,
                maxWidth: '100%',
                height: 44,
                backgroundColor: colors.primaryWhite,
                ...hardShadow,
                borderRadius: '4px',
                overflow: 'hidden',
            }}>
            {button('Fewer doses', -1, <IconMinus size={16} stroke={2.4} />)}
            <Box
                aria-live="polite"
                sx={{
                    textAlign: 'center',
                    lineHeight: 1.15,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderLeft: `1px solid ${colors.primaryBlack}`,
                    borderRight: `1px solid ${colors.primaryBlack}`,
                }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                    {value === 0 ? 'As needed' : `${value}×`}
                </Typography>
                <Typography sx={{ fontSize: 11, color: colors.primaryBrown }}>
                    {value === 0 ? 'not in the daily stack' : 'a day'}
                </Typography>
            </Box>
            {button('More doses', 1, <IconPlus size={16} stroke={2.4} />)}
        </Box>
    )
}
