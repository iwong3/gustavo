'use client'

import { useState } from 'react'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { Currency } from 'utils/currency'
import { LocationByTrip } from 'utils/location'
import { Person, PeopleByTrip } from 'utils/person'
import { SpendType } from 'utils/spend'
import { Trip } from 'utils/trips'
import { addExpense } from 'utils/api'
import { useTripsStore } from 'views/trips'

const defaultCurrencyForTrip = (trip: Trip): Currency => {
    switch (trip) {
        case Trip.Japan2024:
        case Trip.Japan2025:
            return Currency.JPY
        case Trip.SouthKorea2025:
            return Currency.KRW
        case Trip.Vancouver2024:
            return Currency.CAD
        default:
            return Currency.USD
    }
}

const todayISO = () => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
}

type Props = {
    open: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddExpenseDialog({ open, onClose, onSuccess }: Props) {
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    const people = currentTrip ? PeopleByTrip[currentTrip] : []
    const locations = currentTrip ? LocationByTrip[currentTrip] : []

    const [name, setName] = useState('')
    const [date, setDate] = useState(todayISO())
    const [cost, setCost] = useState('')
    const [currency, setCurrency] = useState<Currency>(
        currentTrip ? defaultCurrencyForTrip(currentTrip) : Currency.USD
    )
    const [category, setCategory] = useState('')
    const [paidBy, setPaidBy] = useState('')
    const [splitBetween, setSplitBetween] = useState<string[]>(['Everyone'])
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const isEveryone = splitBetween.includes('Everyone')

    const togglePerson = (person: string) => {
        if (person === 'Everyone') {
            setSplitBetween(['Everyone'])
            return
        }
        // Remove "Everyone" if selecting individual people
        let next = splitBetween.filter((p) => p !== 'Everyone')
        if (next.includes(person)) {
            next = next.filter((p) => p !== person)
        } else {
            next.push(person)
        }
        // If all people selected, switch back to Everyone
        if (next.length === people.length) {
            setSplitBetween(['Everyone'])
        } else if (next.length === 0) {
            setSplitBetween(['Everyone'])
        } else {
            setSplitBetween(next)
        }
    }

    const resetForm = () => {
        setName('')
        setDate(todayISO())
        setCost('')
        setCurrency(currentTrip ? defaultCurrencyForTrip(currentTrip) : Currency.USD)
        setCategory('')
        setPaidBy('')
        setSplitBetween(['Everyone'])
        setLocation('')
        setNotes('')
        setError('')
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = async () => {
        if (!currentTrip) return
        if (!name.trim() || !date || !cost || !paidBy) {
            setError('Please fill in all required fields.')
            return
        }
        const costNum = parseFloat(cost)
        if (isNaN(costNum) || costNum <= 0) {
            setError('Please enter a valid cost.')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            await addExpense(currentTrip, {
                name: name.trim(),
                date,
                cost: costNum,
                currency,
                category: category || undefined,
                paid_by: paidBy,
                split_between: splitBetween,
                location: location || undefined,
                notes: notes.trim() || undefined,
            })
            resetForm()
            onClose()
            onSuccess()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add expense')
        } finally {
            setSubmitting(false)
        }
    }

    const selectSx = { backgroundColor: '#FFFFEF' }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingTop: '8px !important',
                }}>
                {/* Item name */}
                <TextField
                    label="Item name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    sx={selectSx}
                />

                {/* Date */}
                <TextField
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={selectSx}
                />

                {/* Cost + Currency row */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        label="Cost"
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        sx={selectSx}
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Currency</InputLabel>
                        <Select
                            value={currency}
                            label="Currency"
                            onChange={(e) => setCurrency(e.target.value as Currency)}
                            sx={selectSx}>
                            {Object.values(Currency).map((c) => (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Category */}
                <FormControl size="small" fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                        value={category}
                        label="Category"
                        onChange={(e) => setCategory(e.target.value)}
                        sx={selectSx}>
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {Object.values(SpendType).map((t) => (
                            <MenuItem key={t} value={t}>
                                {t}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Paid by */}
                <FormControl size="small" fullWidth required>
                    <InputLabel>Paid by</InputLabel>
                    <Select
                        value={paidBy}
                        label="Paid by"
                        onChange={(e) => setPaidBy(e.target.value)}
                        sx={selectSx}>
                        {people.map((p) => (
                            <MenuItem key={p} value={p}>
                                {p}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Split between */}
                <Box>
                    <Typography variant="body2" sx={{ marginBottom: 0.5 }}>
                        Split between
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                            label="Everyone"
                            onClick={() => togglePerson('Everyone')}
                            color={isEveryone ? 'primary' : 'default'}
                            variant={isEveryone ? 'filled' : 'outlined'}
                            size="small"
                        />
                        {people.map((p) => (
                            <Chip
                                key={p}
                                label={p}
                                onClick={() => togglePerson(p)}
                                color={
                                    !isEveryone && splitBetween.includes(p)
                                        ? 'primary'
                                        : 'default'
                                }
                                variant={
                                    !isEveryone && splitBetween.includes(p)
                                        ? 'filled'
                                        : 'outlined'
                                }
                                size="small"
                            />
                        ))}
                    </Box>
                </Box>

                {/* Location */}
                <FormControl size="small" fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                        value={location}
                        label="Location"
                        onChange={(e) => setLocation(e.target.value)}
                        sx={selectSx}>
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {locations.map((l) => (
                            <MenuItem key={l} value={l}>
                                {l}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Notes */}
                <TextField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    sx={selectSx}
                />

                {error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
