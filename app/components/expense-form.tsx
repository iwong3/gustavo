'use client'

import {
    Autocomplete,
    Box,
    FormControl,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { fetchExpenseCategories } from 'utils/api'
import { queryKeys, staleTimes } from '@/lib/query-keys'

import { colors } from '@/lib/colors'
import type { PlaceDetails } from '@/lib/types'
import {
    adornedFieldSx,
    dropdownMenuItemSx,
    dropdownPaperSx,
    errorMessageSx,
    fieldShadow,
    fieldSx,
    labelSx,
    prefilledFieldSx,
    selectMenuProps,
} from '@/lib/form-styles'
import {
    IconCalendarEvent,
    IconCheck,
    IconChevronLeft,
    IconChevronRight,
    IconX,
} from '@tabler/icons-react'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'
import PlaceAutocomplete from 'components/place-autocomplete'
import { useTripData } from 'providers/trip-data-provider'
import { addExpense, ConflictError, updateExpense } from 'utils/api'
import { formatCurrencyLabel, getCurrencyMeta } from 'utils/currency'
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

// Local date (not UTC) to avoid timezone shift around midnight
const isoDaysAgo = (days: number) =>
    dayjs().subtract(days, 'day').format('YYYY-MM-DD')

// Map a stored expense's place back to the PlaceDetails shape the autocomplete uses
const toPlaceDetails = (expense: Expense | undefined): PlaceDetails | null =>
    expense?.place
        ? {
              placeId: expense.place.googlePlaceId,
              name: expense.place.name,
              address: expense.place.address ?? '',
              lat: expense.place.lat ?? 0,
              lng: expense.place.lng ?? 0,
              addressComponents: [], // Not needed for display
              types: expense.place.types ?? [],
              primaryType: expense.place.primaryType ?? null,
              priceLevel: expense.place.priceLevel ?? null,
              rating: expense.place.rating ?? null,
              website: expense.place.website ?? null,
              hoursJson: expense.place.hoursJson ?? null,
              photoRefs: expense.place.photoRefs ?? null,
          }
        : null

type Props = {
    mode: 'add' | 'edit'
    expense?: Expense
    onCancel: () => void
    onSuccess: () => void
}

export default function ExpenseForm({
    mode,
    expense,
    onCancel,
    onSuccess,
}: Props) {
    const { trip, expenses } = useTripData()

    const people = trip.participants.map((p) => p.firstName)
    const currentUserName =
        trip.participants.find((p) => p.id === trip.currentUserId)?.firstName ??
        ''

    const queryClient = useQueryClient()

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: queryKeys.expenseCategories.list(),
        queryFn: fetchExpenseCategories,
        staleTime: staleTimes.medium,
    })

    const { data: tripLocationItems = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: queryKeys.trips.locations(trip.id),
        queryFn: async () => {
            const res = await fetch(`/api/trips/${trip.id}/locations`)
            if (!res.ok) throw new Error('Failed to fetch locations')
            return res.json()
        },
    })
    const tripLocations = useMemo(
        () => tripLocationItems.map((l) => l.name),
        [tripLocationItems]
    )

    const isEdit = mode === 'edit'

    const [name, setName] = useState(expense?.name ?? '')
    const [date, setDate] = useState(expense?.date ?? isoDaysAgo(0))
    const [cost, setCost] = useState(expense?.costOriginal.toFixed(2) ?? '')
    const [currency, setCurrency] = useState<string>(expense?.currency ?? 'USD')
    const [categoryId, setCategoryId] = useState<number | ''>(
        expense?.categoryId ?? ''
    )
    const [paidBy, setPaidBy] = useState(
        expense?.paidBy.firstName ?? currentUserName
    )
    const [splitBetween, setSplitBetween] = useState<string[]>(
        expense
            ? expense.isEveryone
                ? ['Everyone']
                : expense.splitBetween.map((u) => u.firstName)
            : ['Everyone']
    )
    const [location, setLocation] = useState(expense?.locationName ?? '')
    const [notes, setNotes] = useState(expense?.notes ?? '')
    const [localCurrencyReceived, setLocalCurrencyReceived] = useState(
        expense?.localCurrencyReceived?.toFixed(2) ?? ''
    )
    const [coveredParticipants, setCoveredParticipants] = useState<string[]>(
        expense?.coveredParticipants.map((u) => u.firstName) ?? []
    )
    const [googlePlace, setGooglePlace] = useState<PlaceDetails | null>(() =>
        toPlaceDetails(expense)
    )
    // First day of the week shown in the date strip
    const [weekAnchor, setWeekAnchor] = useState(() => {
        const selected = dayjs((expense?.date ?? isoDaysAgo(0)) + 'T00:00:00')
        return (selected.isValid() ? selected : dayjs()).startOf('week')
    })
    const dateInputRef = useRef<HTMLInputElement>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
    // Track which fields were auto-filled from Google Place (blue highlight until edited)
    const [prefilled, setPrefilled] = useState<{ name: boolean; category: boolean }>({ name: false, category: false })

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
                            queryClient.invalidateQueries({
                                queryKey: queryKeys.trips.locations(trip.id),
                            })
                            setLocation(city)
                        } catch {
                            setLocation(city)
                        }
                    }
                }
            }
        } else {
            // Clear fields that were auto-filled from the place
            if (prefilled.name) setName('')
            if (prefilled.category) setCategoryId('')
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

    // Repopulate when the expense refreshes under us (e.g. after an OCC
    // conflict invalidates the expenses query) so the form shows the latest
    // saved values — mirrors the old drawer behavior.
    useEffect(() => {
        if (mode === 'edit' && expense) {
            setName(expense.name)
            setDate(expense.date)
            setWeekAnchor(
                dayjs(expense.date + 'T00:00:00').startOf('week')
            )
            setCost(expense.costOriginal.toFixed(2))
            setCurrency(expense.currency)
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
            setGooglePlace(toPlaceDetails(expense))
            setNotes(expense.notes ?? '')
            setLocalCurrencyReceived(
                expense.localCurrencyReceived?.toFixed(2) ?? ''
            )
            setCategoryDropdownOpen(false)
        }
    }, [mode, expense])

    // Trip currencies (USD always included). Falls back to legacy single
    // `currency` field for safety when API hasn't been redeployed yet.
    const availableCurrencies = useMemo(() => {
        const list = trip.currencies && trip.currencies.length > 0
            ? trip.currencies
            : [trip.currency ?? 'USD']
        const set = new Set(list)
        set.add('USD')
        // USD first, then alphabetical
        return ['USD', ...Array.from(set).filter((c) => c !== 'USD').sort()]
    }, [trip.currencies, trip.currency])

    // Foreign currencies on this trip (used when Currency Exchange is selected
    // — that category's local currency must be one of these, never USD).
    const foreignCurrencies = useMemo(
        () => availableCurrencies.filter((c) => c !== 'USD'),
        [availableCurrencies]
    )

    const selectedCategory = categories.find((c) => c.id === categoryId)
    const isCurrencyExchange = selectedCategory?.slug === 'currency_exchange'
    const isEveryone = splitBetween.includes('Everyone')

    // When currency exchange is selected, force the currency away from USD
    // (currency exchanges record "USD paid → local received", so the local
    // currency must be a foreign currency) and force split to paidBy.
    useEffect(() => {
        if (isCurrencyExchange) {
            setCurrency((cur) =>
                cur === 'USD' || !foreignCurrencies.includes(cur)
                    ? (foreignCurrencies[0] ?? cur)
                    : cur
            )
            if (paidBy) {
                setSplitBetween([paidBy])
            }
            setCoveredParticipants([])
        }
    }, [isCurrencyExchange, paidBy, foreignCurrencies])

    // Remove payer from covered if they become the payer
    useEffect(() => {
        setCoveredParticipants((prev) => prev.filter((p) => p !== paidBy))
    }, [paidBy])

    const toggleRow = (person: string) => {
        const current = isEveryone ? people : splitBetween
        let next: string[]
        if (current.includes(person)) {
            // A split needs at least one person
            if (current.length === 1) return
            next = current.filter((p) => p !== person)
            // Remove from covered if no longer in split
            setCoveredParticipants((prev) => prev.filter((p) => p !== person))
        } else {
            next = [...current, person]
        }
        setSplitBetween(next.length === people.length ? ['Everyone'] : next)
    }

    // Header toggle: on = everyone, off = collapse to just the payer
    const toggleEveryone = () => {
        if (isEveryone) {
            setSplitBetween([paidBy || people[0]])
            setCoveredParticipants([])
        } else {
            setSplitBetween(['Everyone'])
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

    const allCovered =
        coverableParticipants.length > 0 &&
        coverableParticipants.every((p) =>
            coveredParticipants.includes(p.firstName)
        )

    const toggleTreatAll = () => {
        setCoveredParticipants(
            allCovered ? [] : coverableParticipants.map((p) => p.firstName)
        )
    }

    // Header summary: headcount + per-person share (shown once, not per row)
    const includedCount = isEveryone ? people.length : splitBetween.length
    const costNum = parseFloat(cost)
    const currencyMeta = getCurrencyMeta(currency)
    const splitSummary =
        `${includedCount} ${includedCount === 1 ? 'person' : 'people'}` +
        (!isNaN(costNum) && costNum > 0 && includedCount > 0
            ? ` · ${currencyMeta.symbol}${(costNum / includedCount).toFixed(currencyMeta.decimals)}${includedCount > 1 ? ' each' : ''}`
            : '')


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
            google_place_price_level: googlePlace?.priceLevel ?? undefined,
            google_place_rating: googlePlace?.rating ?? undefined,
            google_place_primary_type: googlePlace?.primaryType ?? undefined,
            google_place_types: googlePlace?.types ?? undefined,
            google_place_website: googlePlace?.website ?? undefined,
            google_place_hours_json: googlePlace?.hoursJson ?? undefined,
            google_place_photo_refs: googlePlace?.photoRefs ?? undefined,
        }

        try {
            if (mode === 'edit' && expense) {
                await updateExpense(trip.id, expense.id, {
                    ...payload,
                    expectedUpdatedAt: expense.updatedAt,
                })
            } else {
                await addExpense(trip.id, payload)
            }
            onSuccess()
        } catch (err) {
            if (err instanceof ConflictError) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.trips.expenses(trip.id),
                })
                setError('This expense was changed by someone else. The form has been refreshed — please review and try again.')
                setSubmitting(false)
                return
            }
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

    // ── Date week strip ──────────────────────────────────────────────────
    const selectedDay = dayjs(date + 'T00:00:00')
    const today = dayjs()
    const weekDays = Array.from({ length: 7 }, (_, i) =>
        weekAnchor.add(i, 'day')
    )

    // Desktop browsers only open the calendar via showPicker(); on iOS the
    // tap lands on the (invisible, full-size) input itself, which opens the
    // native picker without needing this call.
    const openNativePicker = () => {
        try {
            dateInputRef.current?.showPicker()
        } catch {
            // iOS: focusing the input (which the tap already did) opens it
        }
    }

    const pickDate = (value: string) => {
        setDate(value)
        const day = dayjs(value + 'T00:00:00')
        if (day.isValid()) setWeekAnchor(day.startOf('week'))
    }

    // Week paging paddle at either end of the strip
    const weekPaddle = (direction: -1 | 1) => (
        <Box
            onClick={() =>
                setWeekAnchor((a) => a.add(direction * 7, 'day'))
            }
            role="button"
            aria-label={direction > 0 ? 'Next week' : 'Previous week'}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'justifyContent': 'center',
                'width': 30,
                'flexShrink': 0,
                'cursor': 'pointer',
                'userSelect': 'none',
                [direction > 0 ? 'borderLeft' : 'borderRight']: '1px solid',
                'borderColor': 'divider',
                '&:active': { backgroundColor: 'rgba(0,0,0,0.06)' },
            }}>
            {direction > 0 ? (
                <IconChevronRight size={16} color={colors.primaryBlack} />
            ) : (
                <IconChevronLeft size={16} color={colors.primaryBlack} />
            )}
        </Box>
    )

    // Include-checkbox for the split rows
    const includeCheckbox = (on: boolean) => (
        <Box
            sx={{
                width: 18,
                height: 18,
                flexShrink: 0,
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '4px',
                backgroundColor: on
                    ? colors.primaryYellow
                    : colors.primaryWhite,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
            {on && <IconCheck size={13} color={colors.primaryBlack} />}
        </Box>
    )

    // "Treat" toggle pill — marks a share as covered by the payer. State is
    // signalled by fill only (no icon, constant weight) so the width and the
    // row height never shift when toggled.
    const treatPill = (on: boolean, label: string, onToggle: () => void) => (
        <Box
            onClick={(e) => {
                e.stopPropagation()
                onToggle()
            }}
            role="button"
            aria-pressed={on}
            sx={{
                marginLeft: 'auto',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                height: 26,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1,
                paddingX: '10px',
                borderRadius: '13px',
                cursor: 'pointer',
                userSelect: 'none',
                border: `1px solid ${on ? colors.primaryBlack : `${colors.primaryBlack}55`}`,
                backgroundColor: on
                    ? colors.primaryYellow
                    : colors.primaryWhite,
                boxShadow: on ? `1px 1px 0px ${colors.primaryBlack}` : 'none',
                color: on ? colors.primaryBlack : `${colors.primaryBlack}80`,
            }}>
            {label}
        </Box>
    )

    return (
        <>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    color: colors.primaryBlack,
                    padding: '16px 16px 0',
                }}>
                {isEdit ? 'Edit Expense' : 'Add Expense'}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '16px',
                }}>
                {/* 1. Date — week strip: one tap for nearby dates, native
                    calendar (via the header summary) for anything else */}
                <Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 1,
                        }}>
                        <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                            Date *
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}>
                            {/* Selected date — plain text */}
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: colors.primaryBlack,
                                    lineHeight: 1,
                                }}>
                                {selectedDay.isValid()
                                    ? selectedDay.format('ddd, MMM D')
                                    : 'Pick a date'}
                            </Typography>
                            {/* Full-calendar button. The real date input sits
                                invisibly on top so the tap hits it directly —
                                iOS opens its native picker from that tap, while
                                desktop needs the explicit showPicker() call. */}
                            <Box
                                sx={{
                                    'position': 'relative',
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'justifyContent': 'center',
                                    'width': 28,
                                    'height': 28,
                                    'borderRadius': '4px',
                                    'userSelect': 'none',
                                    'backgroundColor': colors.primaryWhite,
                                    'border': `1px solid ${colors.primaryBlack}`,
                                    'boxShadow': fieldShadow,
                                    'transition':
                                        'transform 0.1s, box-shadow 0.1s',
                                    '&:active': {
                                        boxShadow: 'none',
                                        transform: 'translate(2px, 2px)',
                                    },
                                }}>
                                <IconCalendarEvent
                                    size={16}
                                    color={colors.primaryBlack}
                                />
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    value={date}
                                    onChange={(e) => pickDate(e.target.value)}
                                    onClick={openNativePicker}
                                    aria-label="Pick a date"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer',
                                        border: 0,
                                        padding: 0,
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'stretch',
                            backgroundColor: colors.primaryWhite,
                            border: `1px solid ${colors.primaryBlack}`,
                            borderRadius: '4px',
                            boxShadow: fieldShadow,
                            overflow: 'hidden',
                        }}>
                        {weekPaddle(-1)}
                        {weekDays.map((d) => {
                            const isSelected =
                                selectedDay.isValid() &&
                                d.isSame(selectedDay, 'day')
                            const isToday = d.isSame(today, 'day')
                            return (
                                <Box
                                    key={d.format('YYYY-MM-DD')}
                                    onClick={() =>
                                        pickDate(d.format('YYYY-MM-DD'))
                                    }
                                    sx={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '3px',
                                        paddingY: 0.75,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        backgroundColor: isSelected
                                            ? colors.primaryYellow
                                            : 'transparent',
                                        transition:
                                            'background-color 0.15s',
                                    }}>
                                    <Typography
                                        sx={{
                                            fontSize: 9,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            color: 'text.secondary',
                                            lineHeight: 1,
                                        }}>
                                        {d.format('dd')}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: colors.primaryBlack,
                                            lineHeight: 1,
                                        }}>
                                        {d.format('D')}
                                    </Typography>
                                    {/* Today marker */}
                                    <Box
                                        sx={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: '50%',
                                            backgroundColor: isToday
                                                ? colors.primaryBrown
                                                : 'transparent',
                                        }}
                                    />
                                </Box>
                            )
                        })}
                        {weekPaddle(1)}
                    </Box>
                </Box>

                {/* 2. Place (Google Places autocomplete) */}
                <Box>
                    <Typography sx={labelSx}>Place</Typography>
                    <PlaceAutocomplete
                        value={googlePlace}
                        onChange={handlePlaceChange}
                    />
                </Box>

                {/* 3. Expense name */}
                <Box>
                    <Typography sx={labelSx}>Expense name *</Typography>
                    <TextField
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

                {/* 4. Cost + Currency + Paid by */}
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
                        {/* Currency picker. For Currency Exchange the picker
                          * shows only foreign currencies (the local-received
                          * side of the exchange). */}
                        <Box sx={{ minWidth: 100 }}>
                            <Typography sx={labelSx}>
                                {isCurrencyExchange
                                    ? 'To currency *'
                                    : 'Currency *'}
                            </Typography>
                            <FormControl size="small" fullWidth>
                                <Select
                                    value={currency}
                                    onChange={(e) =>
                                        setCurrency(e.target.value)
                                    }
                                    MenuProps={selectMenuProps}
                                    sx={fieldSx}>
                                    {(isCurrencyExchange
                                        ? foreignCurrencies
                                        : availableCurrencies
                                    ).map((c) => (
                                        <MenuItem key={c} value={c}>
                                            {formatCurrencyLabel(c)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
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

                {/* 5. Local currency received (currency exchange only) */}
                {isCurrencyExchange &&
                    (() => {
                        const localMeta = getCurrencyMeta(currency)
                        return (
                            <Box>
                                <Typography
                                    sx={
                                        labelSx
                                    }>{`Local currency received (${currency}) *`}</Typography>
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

                {/* 6. Split between — one row per participant: tap the row to
                    include, "Treat" pill to have the payer cover that share */}
                <Box sx={{ opacity: isCurrencyExchange ? 0.5 : 1 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: 1,
                        }}>
                        <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                            Split between *
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: colors.primaryBlack,
                                lineHeight: 1,
                            }}>
                            {splitSummary}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            backgroundColor: colors.primaryWhite,
                            border: `1px solid ${colors.primaryBlack}`,
                            borderRadius: '4px',
                            boxShadow: fieldShadow,
                            overflow: 'hidden',
                            pointerEvents: isCurrencyExchange ? 'none' : 'auto',
                        }}>
                        {/* Header row: Everyone toggle + Treat all */}
                        <Box
                            onClick={toggleEveryone}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                height: 42,
                                paddingX: '10px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                backgroundColor: colors.secondaryYellow,
                                borderBottom: `1px solid ${colors.primaryBlack}`,
                            }}>
                            {includeCheckbox(isEveryone)}
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: colors.primaryBlack,
                                }}>
                                Everyone
                            </Typography>
                            {coverableParticipants.length > 1 &&
                                treatPill(
                                    allCovered,
                                    'Treat all',
                                    toggleTreatAll
                                )}
                        </Box>
                        {trip.participants.map((p, i) => {
                            const included =
                                isEveryone || splitBetween.includes(p.firstName)
                            const isPayer = p.firstName === paidBy
                            const isCovered = coveredParticipants.includes(
                                p.firstName
                            )
                            return (
                                <Box
                                    key={p.id}
                                    onClick={() => toggleRow(p.firstName)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        height: 42,
                                        paddingX: '10px',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        backgroundColor: included
                                            ? colors.primaryWhite
                                            : `${colors.primaryBlack}08`,
                                        borderBottom:
                                            i < trip.participants.length - 1
                                                ? `1px solid ${colors.primaryBlack}15`
                                                : 'none',
                                        transition: 'background-color 0.15s',
                                    }}>
                                    {includeCheckbox(included)}
                                    <Box
                                        sx={{
                                            opacity: included ? 1 : 0.4,
                                            display: 'flex',
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
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            color: included
                                                ? colors.primaryBlack
                                                : 'text.secondary',
                                        }}>
                                        {p.firstName}
                                    </Typography>
                                    {isPayer && (
                                        <Box
                                            sx={{
                                                fontSize: 10,
                                                lineHeight: 1,
                                                padding: '3px 7px',
                                                borderRadius: '10px',
                                                border: `1px solid ${colors.primaryBlack}`,
                                                backgroundColor:
                                                    colors.primaryYellow,
                                                color: colors.primaryBlack,
                                            }}>
                                            paid
                                        </Box>
                                    )}
                                    {included &&
                                        !isPayer &&
                                        treatPill(isCovered, 'Treat', () =>
                                            toggleCovered(p.firstName)
                                        )}
                                </Box>
                            )
                        })}
                    </Box>
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

                {/* 8. Location (legacy trips only) */}
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

            <PageActionBar>
                <PageActionButton
                    onClick={onCancel}
                    disabled={submitting}
                    icon={<IconX size={22} />}
                    label="Cancel"
                />
                <PageActionButton
                    onClick={handleSubmit}
                    disabled={submitting}
                    icon={<IconCheck size={22} />}
                    label={
                        submitting
                            ? isEdit
                                ? 'Saving...'
                                : 'Adding...'
                            : isEdit
                              ? 'Save'
                              : 'Add'
                    }
                />
            </PageActionBar>
        </>
    )
}
