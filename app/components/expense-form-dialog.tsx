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
import type { PlaceDetails } from '@/lib/types'
import {
    adornedFieldSx,
    dropdownMenuItemSx,
    dropdownPaperSx,
    errorMessageSx,
    fieldSx,
    labelSx,
    prefilledFieldSx,
    primaryButtonSx,
    secondaryButtonSx,
    selectMenuProps,
} from '@/lib/form-styles'
import { IconGift } from '@tabler/icons-react'
import FormDrawer from 'components/form-drawer'
import PlaceAutocomplete from 'components/place-autocomplete'
import { useTripData } from 'providers/trip-data-provider'
import { addExpense, updateExpense } from 'utils/api'
import { Currency, formatCurrencyLabel, getCurrencyMeta } from 'utils/currency'
import {
    getColorForCategory,
    getIconFromCategory,
    InitialsIcon,
} from 'utils/icons'

import type { Expense } from '@/lib/types'

// Legacy trips that still use the manual Location dropdown.
// All other trips auto-derive location from Google Places.
const LEGACY_TRIP_IDS = new Set([1, 2, 3, 4])

// Google Places type → app category name mapping.
// First match wins, so order matters (more specific types first).
const GOOGLE_TYPE_TO_CATEGORY: Record<string, string> = {
    // Food & drink
    restaurant: 'Food', cafe: 'Food', bakery: 'Food', bar: 'Food',
    meal_delivery: 'Food', meal_takeaway: 'Food', food: 'Food',
    coffee_shop: 'Food', ice_cream_shop: 'Food', pizza_restaurant: 'Food',
    seafood_restaurant: 'Food', steak_house: 'Food', sushi_restaurant: 'Food',
    ramen_restaurant: 'Food', sandwich_shop: 'Food', breakfast_restaurant: 'Food',
    brunch_restaurant: 'Food', fast_food_restaurant: 'Food',
    // Lodging
    lodging: 'Lodging', hotel: 'Lodging', motel: 'Lodging',
    resort_hotel: 'Lodging', guest_house: 'Lodging', hostel: 'Lodging',
    bed_and_breakfast: 'Lodging', campground: 'Lodging',
    // Transit
    transit_station: 'Transit', train_station: 'Transit',
    bus_station: 'Transit', subway_station: 'Transit', airport: 'Transit',
    light_rail_station: 'Transit', taxi_stand: 'Transit',
    car_rental: 'Transit', bus_stop: 'Transit',
    // Attraction
    tourist_attraction: 'Attraction', museum: 'Attraction',
    art_gallery: 'Attraction', amusement_park: 'Attraction',
    zoo: 'Attraction', aquarium: 'Attraction', park: 'Attraction',
    national_park: 'Attraction', historical_landmark: 'Attraction',
    performing_arts_theater: 'Attraction', stadium: 'Attraction',
    // Shopping
    store: 'Shopping', shopping_mall: 'Shopping',
    clothing_store: 'Shopping', electronics_store: 'Shopping',
    convenience_store: 'Shopping', supermarket: 'Shopping',
    department_store: 'Shopping', book_store: 'Shopping',
    gift_shop: 'Shopping', grocery_store: 'Shopping', market: 'Shopping',
}

// Substring patterns for fuzzy category matching when exact type lookup misses.
// Checked in order — first match wins.
const CATEGORY_PATTERNS: [string, string][] = [
    ['restaurant', 'Food'], ['cafe', 'Food'], ['bakery', 'Food'],
    ['bar', 'Food'], ['food', 'Food'], ['coffee', 'Food'],
    ['grill', 'Food'], ['diner', 'Food'], ['eatery', 'Food'],
    ['pub', 'Food'], ['bistro', 'Food'], ['tavern', 'Food'],
    ['hotel', 'Lodging'], ['hostel', 'Lodging'], ['motel', 'Lodging'],
    ['lodge', 'Lodging'], ['resort', 'Lodging'], ['inn', 'Lodging'],
    ['station', 'Transit'], ['airport', 'Transit'], ['terminal', 'Transit'],
    ['rental', 'Transit'], ['ferry', 'Transit'],
    ['museum', 'Attraction'], ['park', 'Attraction'], ['theater', 'Attraction'],
    ['theatre', 'Attraction'], ['gallery', 'Attraction'], ['zoo', 'Attraction'],
    ['store', 'Shopping'], ['shop', 'Shopping'], ['mall', 'Shopping'],
    ['market', 'Shopping'], ['supermarket', 'Shopping'],
]

const inferCategoryFromPlace = (types: string[], primaryType: string | null): string | null => {
    // 1. Exact match on primaryType
    if (primaryType && GOOGLE_TYPE_TO_CATEGORY[primaryType]) {
        return GOOGLE_TYPE_TO_CATEGORY[primaryType]
    }
    // 2. Exact match on any type
    for (const t of types) {
        if (GOOGLE_TYPE_TO_CATEGORY[t]) return GOOGLE_TYPE_TO_CATEGORY[t]
    }
    // 3. Substring match on primaryType + types
    const allTypes = primaryType ? [primaryType, ...types] : types
    for (const t of allTypes) {
        for (const [pattern, category] of CATEGORY_PATTERNS) {
            if (t.includes(pattern)) return category
        }
    }
    return null
}

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
    const [coveredParticipants, setCoveredParticipants] = useState<string[]>([])
    const [googlePlace, setGooglePlace] = useState<PlaceDetails | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [tripLocations, setTripLocations] = useState<string[]>([])
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
    // Track which fields were auto-filled from Google Place (blue highlight until edited)
    const [prefilled, setPrefilled] = useState<{ name: boolean; category: boolean }>({ name: false, category: false })
    const nameInputRef = useRef<HTMLInputElement>(null)

    const isLegacyTrip = LEGACY_TRIP_IDS.has(trip.id)

    // Derive city name from Google Place address components
    const deriveCityFromPlace = (place: PlaceDetails): string | null => {
        const components = place.addressComponents
        // Prefer administrative_area_level_1 for Japan (returns "Tokyo" instead of "Shibuya City")
        const country = components.find((c) => c.types.includes('country'))
        const adminLevel1 = components.find((c) => c.types.includes('administrative_area_level_1'))
        const locality = components.find((c) => c.types.includes('locality'))

        if (country?.shortText === 'JP' && adminLevel1) {
            return adminLevel1.longText
        }
        return locality?.longText || adminLevel1?.longText || country?.longText || null
    }

    // Handle Google Place selection — auto-derive location, pre-fill name + category
    const handlePlaceChange = async (place: PlaceDetails | null) => {
        setGooglePlace(place)

        if (place) {
            const newPrefill = { name: false, category: false }

            // Pre-fill expense name if empty
            if (!name.trim()) {
                setName(place.name)
                newPrefill.name = true
            }

            // Pre-fill category if not set
            if (categoryId === '') {
                const inferred = inferCategoryFromPlace(place.types, place.primaryType)
                if (inferred) {
                    const match = categories.find(
                        (c) => c.name.toLowerCase() === inferred.toLowerCase()
                    )
                    if (match) {
                        setCategoryId(match.id)
                        newPrefill.category = true
                    }
                }
            }

            setPrefilled(newPrefill)

            // Auto-derive location for non-legacy trips
            if (!isLegacyTrip) {
                const city = deriveCityFromPlace(place)
                if (city) {
                    const existingLoc = tripLocations.find(
                        (l) => l.toLowerCase() === city.toLowerCase()
                    )
                    if (existingLoc) {
                        setLocation(existingLoc)
                    } else {
                        try {
                            await fetch(`/api/trips/${trip.id}/locations`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: city }),
                            })
                            setTripLocations((prev) => [...prev, city])
                            setLocation(city)
                        } catch {
                            setLocation(city)
                        }
                    }
                }
            }
        } else {
            setPrefilled({ name: false, category: false })
            if (!isLegacyTrip) {
                setLocation('')
            }
        }
    }

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
            setCoveredParticipants(
                expense.coveredParticipants.map((u) => u.firstName)
            )
            setLocation(expense.locationName ?? '')
            setGooglePlace(
                expense.googlePlaceId
                    ? {
                          placeId: expense.googlePlaceId,
                          name: expense.googlePlaceName ?? '',
                          address: expense.googlePlaceAddress ?? '',
                          lat: expense.googlePlaceLat ?? 0,
                          lng: expense.googlePlaceLng ?? 0,
                          addressComponents: [], // Not needed for display
                          types: [],
                          primaryType: null,
                      }
                    : null
            )
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

    // Remove payer from covered if they become the payer
    useEffect(() => {
        setCoveredParticipants((prev) => prev.filter((p) => p !== paidBy))
    }, [paidBy])

    const togglePerson = (person: string) => {
        if (person === 'Everyone') {
            setSplitBetween(['Everyone'])
            setCoveredParticipants([])
            return
        }
        let next = splitBetween.filter((p) => p !== 'Everyone')
        if (next.includes(person)) {
            next = next.filter((p) => p !== person)
            // Remove from covered if no longer in split
            setCoveredParticipants((prev) => prev.filter((p) => p !== person))
        } else {
            next.push(person)
        }
        if (next.length === people.length) {
            setSplitBetween(['Everyone'])
        } else if (next.length === 0) {
            setSplitBetween(['Everyone'])
            setCoveredParticipants([])
        } else {
            setSplitBetween(next)
        }
    }

    const toggleCovered = (person: string) => {
        setCoveredParticipants((prev) =>
            prev.includes(person)
                ? prev.filter((p) => p !== person)
                : [...prev, person]
        )
    }

    // Participants eligible for covering: in the split, not the payer
    const coverableParticipants = useMemo(() => {
        const splitSet = isEveryone ? new Set(people) : new Set(splitBetween)
        return trip.participants.filter(
            (p) => p.firstName !== paidBy && splitSet.has(p.firstName)
        )
    }, [trip.participants, splitBetween, isEveryone, paidBy, people])

    const resetForm = () => {
        setName('')
        setDate(todayISO())
        setCost('')
        setCurrency(Currency.USD)
        setCategoryId('')
        setPaidBy(currentUserName)
        setSplitBetween(['Everyone'])
        setCoveredParticipants([])
        setLocation('')
        setGooglePlace(null)
        setNotes('')
        setLocalCurrencyReceived('')
        setError('')
        setCategoryDropdownOpen(false)
        setPrefilled({ name: false, category: false })
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
            covered_participants:
                coveredParticipants.length > 0
                    ? coveredParticipants
                    : undefined,
            location: location || undefined,
            notes: notes.trim() || undefined,
            local_currency_received: localReceivedNum || undefined,
            google_place_id: googlePlace?.placeId || undefined,
            google_place_name: googlePlace?.name || undefined,
            google_place_address: googlePlace?.address || undefined,
            google_place_lat: googlePlace?.lat || undefined,
            google_place_lng: googlePlace?.lng || undefined,
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
                {/* 1. Place (Google Places autocomplete) */}
                <Box>
                    <Typography sx={labelSx}>Place</Typography>
                    <PlaceAutocomplete
                        value={googlePlace}
                        onChange={handlePlaceChange}
                    />
                </Box>

                {/* 2. Expense name */}
                <Box>
                    <Typography sx={labelSx}>Expense name *</Typography>
                    <TextField
                        inputRef={nameInputRef}
                        placeholder="e.g. Lunch at cafe"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value)
                            if (prefilled.name) setPrefilled((p) => ({ ...p, name: false }))
                        }}
                        required
                        fullWidth
                        size="small"
                        slotProps={{ htmlInput: { maxLength: 200 } }}
                        sx={prefilled.name ? prefilledFieldSx : fieldSx}
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
                                onChange={(e) => {
                                    const v = e.target.value
                                    if (v === '' || /^\d*\.?\d*$/.test(v)) setCost(v)
                                }}
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
                                    },
                                    input: {
                                        startAdornment: (
                                            <Box
                                                component="span"
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'text.secondary',
                                                    flexShrink: 0,
                                                    userSelect: 'none',
                                                }}>
                                                {isCurrencyExchange
                                                    ? '$'
                                                    : getCurrencyMeta(currency)
                                                          .symbol}
                                            </Box>
                                        ),
                                    },
                                }}
                                sx={adornedFieldSx}
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
                                    onChange={(e) => {
                                        const v = e.target.value
                                        if (v === '' || /^\d*\.?\d*$/.test(v)) setLocalCurrencyReceived(v)
                                    }}
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
                                        },
                                        input: {
                                            startAdornment: (
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'text.secondary',
                                                        flexShrink: 0,
                                                        userSelect: 'none',
                                                    }}>
                                                    {localMeta.symbol}
                                                </Box>
                                            ),
                                        },
                                    }}
                                    sx={adornedFieldSx}
                                />
                            </Box>
                        )
                    })()}

                {/* SVG gradient definition for gift icons */}
                <svg width={0} height={0} style={{ position: 'absolute' }}>
                    <defs>
                        <linearGradient
                            id="giftGradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%">
                            <stop offset="0%" stopColor="#e67e22" />
                            <stop offset="100%" stopColor="#c0392b" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* 5. Split between — multi-select avatar row with gift toggle (Place field follows) */}
                <Box sx={{ opacity: isCurrencyExchange ? 0.5 : 1 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 1,
                        }}>
                        <Typography sx={labelSx}>Split between *</Typography>
                        {!isCurrencyExchange &&
                            coverableParticipants.length > 0 && (
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        color: 'text.secondary',
                                        fontStyle: 'italic',
                                        lineHeight: 1,
                                    }}>
                                    tap{' '}
                                    <IconGift
                                        size={10}
                                        color={colors.primaryBlack}
                                        style={{
                                            verticalAlign: '-1px',
                                        }}
                                    />{' '}
                                    to cover
                                </Typography>
                            )}
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1.5,
                            alignItems: 'flex-start',
                            pointerEvents: isCurrencyExchange ? 'none' : 'auto',
                        }}>
                        <Box
                            onClick={() => togglePerson('Everyone')}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                opacity: isEveryone ? 1 : 0.4,
                                transition: 'opacity 0.15s',
                                // Reserve space for gift icon row below
                                paddingBottom: !isCurrencyExchange ? '24px' : 0,
                            }}>
                            <InitialsIcon
                                name="All"
                                initials="All"
                                sx={{
                                    width: 28,
                                    height: 28,
                                    fontSize: 10,
                                }}
                            />
                        </Box>
                        {trip.participants.map((p) => {
                            const selected =
                                isEveryone || splitBetween.includes(p.firstName)
                            const isCoverable =
                                selected &&
                                p.firstName !== paidBy &&
                                !isCurrencyExchange
                            const isCovered = coveredParticipants.includes(
                                p.firstName
                            )
                            return (
                                <Box
                                    key={p.id}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 0.25,
                                    }}>
                                    <Box
                                        onClick={() =>
                                            togglePerson(p.firstName)
                                        }
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
                                                width: 28,
                                                height: 28,
                                                fontSize: 11,
                                            }}
                                        />
                                    </Box>
                                    {isCoverable ? (
                                        <Box
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleCovered(p.firstName)
                                            }}
                                            sx={{
                                                cursor: 'pointer',
                                                opacity: isCovered ? 1 : 0.3,
                                                transition: 'opacity 0.15s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: 22,
                                            }}>
                                            <IconGift
                                                size={20}
                                                color={colors.primaryBlack}
                                                fill={
                                                    isCovered
                                                        ? 'url(#giftGradient)'
                                                        : 'none'
                                                }
                                                fillOpacity={
                                                    isCovered ? 0.6 : undefined
                                                }
                                            />
                                        </Box>
                                    ) : (
                                        // Spacer to keep alignment
                                        !isCurrencyExchange && (
                                            <Box sx={{ height: 22 }} />
                                        )
                                    )}
                                </Box>
                            )
                        })}
                    </Box>
                </Box>

                {/* 7. Date (pre-filled to today) */}
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

                {/* 8. Category */}
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
                            if (prefilled.category) setPrefilled((p) => ({ ...p, category: false }))
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
                                sx={prefilled.category ? prefilledFieldSx : fieldSx}
                            />
                        )}
                    />
                </Box>

                {/* 9. Location (legacy trips only) */}
                {isLegacyTrip && (
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
                )}

                {/* 10. Notes */}
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
                        slotProps={{ htmlInput: { maxLength: 2000 } }}
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
