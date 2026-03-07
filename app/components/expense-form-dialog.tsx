'use client'

import { useEffect, useState } from 'react'
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

import { Currency, getCurrencyMeta, formatCurrencyLabel } from 'utils/currency'
import { addExpense, updateExpense } from 'utils/api'
import { useTripData } from 'providers/trip-data-provider'
import { colors } from '@/lib/colors'

import type { Expense } from '@/lib/types'

type Category = { id: number; name: string; slug: string | null }

const todayISO = () => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
}

type Props = {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    mode: 'add' | 'edit'
    expense?: Expense
}

export default function ExpenseFormDialog({ open, onClose, onSuccess, mode, expense }: Props) {
    const { trip } = useTripData()

    const people = trip.participants.map((p) => p.firstName)

    const [categories, setCategories] = useState<Category[]>([])
    const [name, setName] = useState('')
    const [date, setDate] = useState(todayISO())
    const [cost, setCost] = useState('')
    const [currency, setCurrency] = useState<Currency>(Currency.USD)
    const [categoryId, setCategoryId] = useState<number | ''>('')
    const [paidBy, setPaidBy] = useState('')
    const [splitBetween, setSplitBetween] = useState<string[]>(['Everyone'])
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [localCurrencyReceived, setLocalCurrencyReceived] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [tripLocations, setTripLocations] = useState<string[]>([])

    useEffect(() => {
        if (open) {
            fetch('/api/expense-categories')
                .then((res) => res.json())
                .then((data) => setCategories(data))
                .catch(() => {})

            fetch(`/api/trips/${trip.id}/locations`)
                .then((res) => res.json())
                .then((data: { id: number; name: string }[]) =>
                    setTripLocations(data.map((l) => l.name))
                )
                .catch(() => {})
        }
    }, [open, trip.id])

    useEffect(() => {
        if (open && mode === 'edit' && expense) {
            setName(expense.name)
            setDate(expense.date)
            setCost(expense.costOriginal.toFixed(2))
            setCurrency(expense.currency as Currency)
            setCategoryId(expense.categoryId ?? '')
            setPaidBy(expense.paidBy.firstName)
            if (expense.isEveryone) {
                setSplitBetween(['Everyone'])
            } else {
                setSplitBetween(expense.splitBetween.map((u) => u.firstName))
            }
            setLocation(expense.locationName ?? '')
            setNotes(expense.notes ?? '')
            setLocalCurrencyReceived(expense.localCurrencyReceived?.toFixed(2) ?? '')
            setError('')
        } else if (open && mode === 'add') {
            resetForm()
        }
    }, [open, mode, expense])

    const tripCurrency = (trip.currency ?? 'USD') as Currency
    const availableCurrencies = tripCurrency === Currency.USD
        ? [Currency.USD]
        : [Currency.USD, tripCurrency]

    const selectedCategory = categories.find((c) => c.id === categoryId)
    const isCurrencyExchange = selectedCategory?.slug === 'currency_exchange'
    const isEveryone = splitBetween.includes('Everyone')

    // When currency exchange is selected, force currency to trip currency and split to paidBy
    useEffect(() => {
        if (isCurrencyExchange) {
            setCurrency(tripCurrency)
            if (paidBy) {
                setSplitBetween([paidBy])
            }
        }
    }, [isCurrencyExchange, paidBy, tripCurrency])

    const togglePerson = (person: string) => {
        if (person === 'Everyone') {
            setSplitBetween(['Everyone'])
            return
        }
        let next = splitBetween.filter((p) => p !== 'Everyone')
        if (next.includes(person)) {
            next = next.filter((p) => p !== person)
        } else {
            next.push(person)
        }
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
        setCurrency(Currency.USD)
        setCategoryId('')
        setPaidBy('')
        setSplitBetween(['Everyone'])
        setLocation('')
        setNotes('')
        setLocalCurrencyReceived('')
        setError('')
    }

    const handleClose = () => {
        onClose()
        setTimeout(resetForm, 300)
    }

    const handleSubmit = async () => {
        if (!name.trim() || !date || !cost || !paidBy) {
            setError('Please fill in all required fields.')
            return
        }
        const costNum = parseFloat(cost)
        if (isNaN(costNum) || costNum <= 0) {
            setError('Please enter a valid cost.')
            return
        }
        if (isCurrencyExchange && !localCurrencyReceived) {
            setError('Please enter the local currency amount received.')
            return
        }
        const localReceivedNum = localCurrencyReceived ? parseFloat(localCurrencyReceived) : undefined
        if (isCurrencyExchange && (isNaN(localReceivedNum!) || localReceivedNum! <= 0)) {
            setError('Please enter a valid local currency amount.')
            return
        }

        setSubmitting(true)
        setError('')

        const payload = {
            name: name.trim(),
            date,
            cost: costNum,
            currency,
            category_id: categoryId || undefined,
            paid_by: paidBy,
            split_between: splitBetween,
            location: location || undefined,
            notes: notes.trim() || undefined,
            local_currency_received: localReceivedNum || undefined,
        }

        try {
            if (mode === 'edit' && expense) {
                await updateExpense(trip.id, expense.id, payload)
            } else {
                await addExpense(trip.id, payload)
            }
            resetForm()
            onClose()
            onSuccess()
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : mode === 'edit'
                      ? 'Failed to update expense'
                      : 'Failed to add expense'
            )
        } finally {
            setSubmitting(false)
        }
    }

    const isEdit = mode === 'edit'
    const fieldSx = {
        'backgroundColor': colors.primaryWhite,
        'borderRadius': '4px',
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primaryBlack,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primaryBlack,
        },
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        backgroundColor: colors.secondaryYellow,
                        border: `1px solid ${colors.primaryBlack}`,
                        boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                        borderRadius: '6px',
                    },
                },
            }}>
            <DialogTitle sx={{ fontWeight: 700, color: colors.primaryBlack }}>
                {isEdit ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingTop: '8px !important',
                }}>
                <TextField
                    label="Item name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    sx={fieldSx}
                />

                <TextField
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={fieldSx}
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        label={isCurrencyExchange ? 'USD paid' : 'Cost'}
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        onBlur={() => {
                            const n = parseFloat(cost)
                            if (!isNaN(n)) setCost(n.toFixed(isCurrencyExchange ? 2 : getCurrencyMeta(currency).decimals))
                        }}
                        required
                        fullWidth
                        size="small"
                        slotProps={{
                            htmlInput: { min: 0, step: isCurrencyExchange ? '0.01' : getCurrencyMeta(currency).step },
                            input: isCurrencyExchange ? { startAdornment: <Typography sx={{ marginRight: 0.5, color: 'text.secondary' }}>$</Typography> } : undefined,
                        }}
                        sx={fieldSx}
                    />
                    {!isCurrencyExchange && (
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Currency</InputLabel>
                            <Select
                                value={currency}
                                label="Currency"
                                onChange={(e) => setCurrency(e.target.value as Currency)}
                                sx={fieldSx}>
                                {availableCurrencies.map((c) => (
                                    <MenuItem key={c} value={c}>
                                        {formatCurrencyLabel(c)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Box>

                <FormControl size="small" fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                        value={categoryId}
                        label="Category"
                        onChange={(e) => setCategoryId(e.target.value as number | '')}
                        sx={fieldSx}>
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {categories.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                                {c.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {isCurrencyExchange && (() => {
                    const localMeta = getCurrencyMeta(tripCurrency)
                    return (
                        <TextField
                            label={`Local currency received (${tripCurrency})`}
                            type="number"
                            value={localCurrencyReceived}
                            onChange={(e) => setLocalCurrencyReceived(e.target.value)}
                            onBlur={() => {
                                const n = parseFloat(localCurrencyReceived)
                                if (!isNaN(n)) setLocalCurrencyReceived(n.toFixed(localMeta.decimals))
                            }}
                            required
                            fullWidth
                            size="small"
                            slotProps={{
                                htmlInput: { min: 0, step: localMeta.step },
                                input: { startAdornment: <Typography sx={{ marginRight: 0.5, color: 'text.secondary' }}>{localMeta.symbol}</Typography> },
                            }}
                            sx={fieldSx}
                        />
                    )
                })()}

                <FormControl size="small" fullWidth required>
                    <InputLabel>Paid by</InputLabel>
                    <Select
                        value={paidBy}
                        label="Paid by"
                        onChange={(e) => setPaidBy(e.target.value)}
                        sx={fieldSx}>
                        {people.map((p) => (
                            <MenuItem key={p} value={p}>
                                {p}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ opacity: isCurrencyExchange ? 0.5 : 1 }}>
                    <Typography variant="body2" sx={{ marginBottom: 0.5 }}>
                        Split between
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pointerEvents: isCurrencyExchange ? 'none' : 'auto' }}>
                        <Chip
                            label="Everyone"
                            onClick={() => togglePerson('Everyone')}
                            size="small"
                            sx={{
                                'border': `1px solid ${colors.primaryBlack}`,
                                'backgroundColor': isEveryone
                                    ? colors.primaryYellow
                                    : colors.primaryWhite,
                                'fontWeight': isEveryone ? 600 : 400,
                                '&:hover': {
                                    backgroundColor: isEveryone
                                        ? colors.primaryYellow
                                        : colors.primaryWhite,
                                },
                            }}
                        />
                        {people.map((p) => {
                            const selected = !isEveryone && splitBetween.includes(p)
                            return (
                                <Chip
                                    key={p}
                                    label={p}
                                    onClick={() => togglePerson(p)}
                                    size="small"
                                    sx={{
                                        'border': `1px solid ${colors.primaryBlack}`,
                                        'backgroundColor': selected
                                            ? colors.primaryYellow
                                            : colors.primaryWhite,
                                        'fontWeight': selected ? 600 : 400,
                                        '&:hover': {
                                            backgroundColor: selected
                                                ? colors.primaryYellow
                                                : colors.primaryWhite,
                                        },
                                    }}
                                />
                            )
                        })}
                    </Box>
                </Box>

                <FormControl size="small" fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                        value={location}
                        label="Location"
                        onChange={(e) => setLocation(e.target.value)}
                        sx={fieldSx}>
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {tripLocations.map((l) => (
                            <MenuItem key={l} value={l}>
                                {l}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                />

                {error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ padding: 2, paddingTop: 0 }}>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{
                        backgroundColor: colors.primaryYellow,
                        fontWeight: 600,
                    }}>
                    {submitting
                        ? isEdit
                            ? 'Saving...'
                            : 'Adding...'
                        : isEdit
                          ? 'Save'
                          : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
