'use client'

import {
    Autocomplete,
    Box,
    Button,
    FormControl,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

import { colors } from '@/lib/colors'
import { primaryButtonSx, secondaryButtonSx } from '@/lib/form-styles'
import {
    dropdownMenuItemSx,
    dropdownPaperSx,
    errorMessageSx,
    fieldSx,
    labelSx,
    selectMenuProps,
} from '@/lib/form-styles'
import FormDrawer from 'components/form-drawer'
import { useTripData } from 'providers/trip-data-provider'
import { addExpense, updateExpense } from 'utils/api'
import { Currency, formatCurrencyLabel, getCurrencyMeta } from 'utils/currency'
import {
    getColorForCategory,
    getIconFromCategory,
    InitialsIcon,
} from 'utils/icons'

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

export default function ExpenseFormDialog({
    open,
    onClose,
    onSuccess,
    mode,
    expense,
}: Props) {
    const { trip, expenses } = useTripData()

    const people = trip.participants.map((p) => p.firstName)
    const currentUserName =
        trip.participants.find((p) => p.id === trip.currentUserId)?.firstName ??
        ''

    const [categories, setCategories] = useState<Category[]>([])
    const [name, setName] = useState('')
    const [date, setDate] = useState(todayISO())
    const [cost, setCost] = useState('')
    const [currency, setCurrency] = useState<Currency>(Currency.USD)
    const [categoryId, setCategoryId] = useState<number | ''>('')
    const [paidBy, setPaidBy] = useState(currentUserName)
    const [splitBetween, setSplitBetween] = useState<string[]>(['Everyone'])
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [localCurrencyReceived, setLocalCurrencyReceived] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [tripLocations, setTripLocations] = useState<string[]>([])
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
    const nameInputRef = useRef<HTMLInputElement>(null)

    // Count category usage from trip expenses to rank options
    const categoryUsage = useMemo(() => {
        const counts = new Map<number, number>()
        for (const e of expenses) {
            if (e.categoryId != null) {
                counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1)
            }
        }
        return counts
    }, [expenses])

    // Sort categories by usage desc, alphabetical for ties, "Other" last
    const sortedCategories = useMemo(() => {
        if (categories.length === 0) return []
        const withCount = categories.map((c) => ({
            ...c,
            count: categoryUsage.get(c.id) ?? 0,
        }))
        withCount.sort((a, b) => {
            const aOther = a.name.toLowerCase() === 'other'
            const bOther = b.name.toLowerCase() === 'other'
            if (aOther && !bOther) return 1
            if (!aOther && bOther) return -1
            if (b.count !== a.count) return b.count - a.count
            return a.name.localeCompare(b.name)
        })
        return withCount
    }, [categories, categoryUsage])

    const selectedCategoryObj =
        sortedCategories.find((c) => c.id === categoryId) ?? null

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
            setLocalCurrencyReceived(
                expense.localCurrencyReceived?.toFixed(2) ?? ''
            )
            setError('')
            setCategoryDropdownOpen(false)
        } else if (open && mode === 'add') {
            resetForm()
            // Auto-focus expense name after drawer animation
            setTimeout(() => nameInputRef.current?.focus(), 350)
        }
    }, [open, mode, expense])

    const tripCurrency = (trip.currency ?? 'USD') as Currency
    const availableCurrencies =
        tripCurrency === Currency.USD
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
        setPaidBy(currentUserName)
        setSplitBetween(['Everyone'])
        setLocation('')
        setNotes('')
        setLocalCurrencyReceived('')
        setError('')
        setCategoryDropdownOpen(false)
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
        const localReceivedNum = localCurrencyReceived
            ? parseFloat(localCurrencyReceived)
            : undefined
        if (
            isCurrencyExchange &&
            (isNaN(localReceivedNum!) || localReceivedNum! <= 0)
        ) {
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

    return (
        <FormDrawer open={open} onClose={handleClose}>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    color: colors.primaryBlack,
                    padding: '16px 24px 0',
                }}>
                {isEdit ? 'Edit Expense' : 'Add Expense'}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '16px 24px',
                    flex: 1,
                    overflowY: 'auto',
                }}>
                {/* 1. Expense name */}
                <Box>
                    <Typography sx={labelSx}>Expense name *</Typography>
                    <TextField
                        inputRef={nameInputRef}
                        placeholder="e.g. Lunch at cafe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        sx={fieldSx}
                    />
                </Box>

                {/* 2. Cost + Currency + Paid by */}
                <Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={labelSx}>
                                {isCurrencyExchange ? 'USD paid *' : 'Cost *'}
                            </Typography>
                            <TextField
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                onBlur={() => {
                                    const n = parseFloat(cost)
                                    if (!isNaN(n))
                                        setCost(
                                            n.toFixed(
                                                isCurrencyExchange
                                                    ? 2
                                                    : getCurrencyMeta(currency)
                                                          .decimals
                                            )
                                        )
                                }}
                                required
                                fullWidth
                                size="small"
                                slotProps={{
                                    htmlInput: {
                                        inputMode: 'decimal',
                                        min: 0,
                                        step: isCurrencyExchange
                                            ? '0.01'
                                            : getCurrencyMeta(currency).step,
                                    },
                                    input: {
                                        startAdornment: (
                                            <Typography
                                                sx={{
                                                    marginRight: 0.5,
                                                    color: 'text.secondary',
                                                }}>
                                                {isCurrencyExchange
                                                    ? '$'
                                                    : getCurrencyMeta(currency)
                                                          .symbol}
                                            </Typography>
                                        ),
                                    },
                                }}
                                sx={fieldSx}
                            />
                        </Box>
                        {!isCurrencyExchange && (
                            <Box sx={{ minWidth: 100 }}>
                                <Typography sx={labelSx}>Currency *</Typography>
                                <FormControl size="small" fullWidth>
                                    <Select
                                        value={currency}
                                        onChange={(e) =>
                                            setCurrency(
                                                e.target.value as Currency
                                            )
                                        }
                                        MenuProps={selectMenuProps}
                                        sx={fieldSx}>
                                        {availableCurrencies.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                {formatCurrencyLabel(c)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        )}
                        <Box>
                            <Typography sx={labelSx}>Paid by *</Typography>
                            <FormControl size="small">
                                <Select
                                    value={paidBy}
                                    onChange={(e) => setPaidBy(e.target.value)}
                                    MenuProps={{
                                        ...selectMenuProps,
                                        anchorOrigin: {
                                            vertical: 'bottom',
                                            horizontal: 'right',
                                        },
                                        transformOrigin: {
                                            vertical: 'top',
                                            horizontal: 'right',
                                        },
                                    }}
                                    renderValue={(val) => {
                                        const p = trip.participants.find(
                                            (u) => u.firstName === val
                                        )
                                        return p ? (
                                            <InitialsIcon
                                                name={p.firstName}
                                                initials={p.initials}
                                                iconColor={p.iconColor}
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    fontSize: 10,
                                                }}
                                            />
                                        ) : (
                                            val
                                        )
                                    }}
                                    sx={{
                                        ...fieldSx,
                                        'height': 40,
                                        '& .MuiSelect-select': {
                                            display: 'flex',
                                            alignItems: 'center',
                                        },
                                    }}>
                                    {trip.participants.map((p) => (
                                        <MenuItem
                                            key={p.id}
                                            value={p.firstName}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}>
                                            <InitialsIcon
                                                name={p.firstName}
                                                initials={p.initials}
                                                iconColor={p.iconColor}
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    fontSize: 10,
                                                }}
                                            />
                                            {p.firstName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </Box>

                {/* 3. Local currency received (currency exchange only) */}
                {isCurrencyExchange &&
                    (() => {
                        const localMeta = getCurrencyMeta(tripCurrency)
                        return (
                            <Box>
                                <Typography
                                    sx={
                                        labelSx
                                    }>{`Local currency received (${tripCurrency}) *`}</Typography>
                                <TextField
                                    value={localCurrencyReceived}
                                    onChange={(e) =>
                                        setLocalCurrencyReceived(e.target.value)
                                    }
                                    onBlur={() => {
                                        const n = parseFloat(
                                            localCurrencyReceived
                                        )
                                        if (!isNaN(n))
                                            setLocalCurrencyReceived(
                                                n.toFixed(localMeta.decimals)
                                            )
                                    }}
                                    required
                                    fullWidth
                                    size="small"
                                    slotProps={{
                                        htmlInput: {
                                            inputMode: 'decimal',
                                            min: 0,
                                            step: localMeta.step,
                                        },
                                        input: {
                                            startAdornment: (
                                                <Typography
                                                    sx={{
                                                        marginRight: 0.5,
                                                        color: 'text.secondary',
                                                    }}>
                                                    {localMeta.symbol}
                                                </Typography>
                                            ),
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            </Box>
                        )
                    })()}

                {/* 5. Split between — multi-select avatar row with opacity toggle */}
                <Box sx={{ opacity: isCurrencyExchange ? 0.5 : 1 }}>
                    <Typography sx={labelSx}>Split between *</Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.75,
                            alignItems: 'center',
                            pointerEvents: isCurrencyExchange ? 'none' : 'auto',
                        }}>
                        <Box
                            onClick={() => togglePerson('Everyone')}
                            sx={{
                                cursor: 'pointer',
                                opacity: isEveryone ? 1 : 0.4,
                                transition: 'opacity 0.15s',
                            }}>
                            <InitialsIcon
                                name="All"
                                initials="All"
                                sx={{
                                    width: 32,
                                    height: 32,
                                    fontSize: 10,
                                }}
                            />
                        </Box>
                        {trip.participants.map((p) => {
                            const selected =
                                isEveryone || splitBetween.includes(p.firstName)
                            return (
                                <Box
                                    key={p.id}
                                    onClick={() => togglePerson(p.firstName)}
                                    sx={{
                                        cursor: 'pointer',
                                        opacity: selected ? 1 : 0.4,
                                        transition: 'opacity 0.15s',
                                    }}>
                                    <InitialsIcon
                                        name={p.firstName}
                                        initials={p.initials}
                                        iconColor={p.iconColor}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            fontSize: 12,
                                        }}
                                    />
                                </Box>
                            )
                        })}
                    </Box>
                </Box>

                {/* 6. Date (pre-filled to today) */}
                <Box sx={{ maxWidth: 180 }}>
                    <Typography sx={labelSx}>Date *</Typography>
                    <TextField
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={fieldSx}
                    />
                </Box>

                {/* 7. Category */}
                <Box>
                    <Typography sx={labelSx}>Category</Typography>
                    <Autocomplete
                        open={categoryDropdownOpen}
                        onOpen={() => setCategoryDropdownOpen(true)}
                        onClose={() => setCategoryDropdownOpen(false)}
                        options={sortedCategories}
                        getOptionLabel={(opt) => opt.name}
                        value={selectedCategoryObj}
                        onChange={(_, val) => {
                            setCategoryId(val ? val.id : '')
                            setCategoryDropdownOpen(false)
                        }}
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        disablePortal
                        size="small"
                        slotProps={{
                            listbox: {
                                sx: {
                                    'maxHeight': 200,
                                    '& .MuiAutocomplete-option':
                                        dropdownMenuItemSx,
                                },
                            },
                            paper: {
                                sx: dropdownPaperSx,
                            },
                        }}
                        renderOption={(props, option) => {
                            const { key, ...rest } = props
                            return (
                                <li key={key} {...rest}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            width: '100%',
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                backgroundColor:
                                                    getColorForCategory(
                                                        option.name
                                                    ),
                                                flexShrink: 0,
                                            }}>
                                            {getIconFromCategory(
                                                option.name,
                                                14
                                            )}
                                        </Box>
                                        <Typography variant="body2">
                                            {option.name}
                                        </Typography>
                                    </Box>
                                </li>
                            )
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Search categories..."
                                sx={fieldSx}
                            />
                        )}
                    />
                </Box>

                {/* 8. Location */}
                <Box>
                    <Typography sx={labelSx}>Location</Typography>
                    <FormControl size="small" fullWidth>
                        <Select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            displayEmpty
                            MenuProps={selectMenuProps}
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
                </Box>

                {/* 9. Notes */}
                <Box>
                    <Typography sx={labelSx}>Notes</Typography>
                    <TextField
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional"
                        multiline
                        rows={2}
                        fullWidth
                        size="small"
                        sx={fieldSx}
                    />
                </Box>

                {error && (
                    <Typography variant="body2" sx={errorMessageSx}>
                        {error}
                    </Typography>
                )}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    padding: '16px 24px',
                    paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))`,
                }}>
                <Button
                    onClick={handleClose}
                    disabled={submitting}
                    size="large"
                    sx={secondaryButtonSx}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    size="large"
                    sx={primaryButtonSx}>
                    {submitting
                        ? isEdit
                            ? 'Saving...'
                            : 'Adding...'
                        : isEdit
                          ? 'Save'
                          : 'Add'}
                </Button>
            </Box>
        </FormDrawer>
    )
}
