'use client'

import {
    Box,
    ButtonBase,
    FormControl,
    Menu,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { fetchExpenseCategories } from 'utils/api'
import { queryKeys, staleTimes } from '@/lib/query-keys'

import { colors, pressTextSx } from '@/lib/colors'
import { findPossibleDuplicates } from '@/lib/expense-duplicates'
import { derivePlaceCity } from '@/lib/place-display'
import type { PlaceDetails } from '@/lib/types'
import {
    adornedErrorFieldSx,
    adornedFieldSx,
    errorFieldSx,
    errorLabelSx,
    fieldShadow,
    fieldSx,
    labelSx,
    prefilledFieldSx,
    selectMenuProps,
} from '@/lib/form-styles'
import { IconCheck, IconChevronDown, IconCopy } from '@tabler/icons-react'
import { CategoryPicker } from 'components/category-picker'
import { FormDateField } from 'components/form-date-field'
import { FormPage } from 'components/form-page'
import PlaceAutocomplete from 'components/place-autocomplete'
import { useTripData } from 'providers/trip-data-provider'
import { addExpense, ConflictError, updateExpense } from 'utils/api'
import { formatCurrencyLabel, getCurrencyMeta } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { NIGHT_CUTOFF_HOUR } from 'utils/time'

import type { Expense } from '@/lib/types'

// Legacy trips that still use the manual Location dropdown.
// All other trips auto-derive location from Google Places.
// Ids are BIGINT strings at runtime — compare as strings
const LEGACY_TRIP_IDS = new Set(['1', '2', '3', '4'])

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

// Late-night guard: an expense logged between midnight and 6am is usually from
// the previous evening, so a NEW expense defaults to yesterday. A "Use today?"
// link in the date header explains the backdate and undoes it in one tap.
const defaultNewExpenseDate = () =>
    isoDaysAgo(dayjs().hour() < NIGHT_CUTOFF_HOUR ? 1 : 0)

// Map a stored expense's place back to the PlaceDetails shape the autocomplete
// uses. Carries every cached field through, so re-saving an unchanged place
// writes back what we already knew instead of a thinner version of it.
const toPlaceDetails = (expense: Expense | undefined): PlaceDetails | null =>
    expense?.place
        ? {
              placeId: expense.place.googlePlaceId,
              name: expense.place.name,
              address: expense.place.address ?? '',
              lat: expense.place.lat ?? 0,
              lng: expense.place.lng ?? 0,
              addressComponents: expense.place.addressComponents ?? [],
              types: expense.place.types ?? [],
              primaryType: expense.place.primaryType ?? null,
              priceLevel: expense.place.priceLevel ?? null,
              priceRange: expense.place.priceRange ?? null,
              rating: expense.place.rating ?? null,
              userRatingCount: expense.place.userRatingCount ?? null,
              website: expense.place.website ?? null,
              hoursJson: expense.place.hoursJson ?? null,
              photoRefs: expense.place.photoRefs ?? null,
          }
        : null

// Required inputs the submit check can flag, in on-screen order
type InvalidField = 'name' | 'cost' | 'localReceived'

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

    // People are tracked by user id (as a string — BIGINT ids arrive as
    // strings), never by first name: two people can share one. Names are
    // only for display.
    const people = trip.participants.map((p) => String(p.id))
    const currentUserKey = people.includes(String(trip.currentUserId))
        ? String(trip.currentUserId)
        : ''

    const queryClient = useQueryClient()

    const { data: categories = [], isPending: categoriesPending } = useQuery<Category[]>({
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
    const [date, setDate] = useState(expense?.date ?? defaultNewExpenseDate())
    // True while the late-night default is in effect; any manual pick clears it.
    const [nightGuardActive, setNightGuardActive] = useState(
        () => !expense && dayjs().hour() < NIGHT_CUTOFF_HOUR
    )
    const [cost, setCost] = useState(expense?.costOriginal.toFixed(2) ?? '')
    const [currency, setCurrency] = useState<string>(expense?.currency ?? 'USD')
    const [categoryId, setCategoryId] = useState<number | ''>(
        expense?.categoryId ?? ''
    )
    const [paidBy, setPaidBy] = useState(
        expense ? String(expense.paidBy.id) : currentUserKey
    )
    const [splitBetween, setSplitBetween] = useState<string[]>(
        expense
            ? expense.isEveryone
                ? ['Everyone']
                : expense.splitBetween.map((u) => String(u.id))
            : ['Everyone']
    )
    const [location, setLocation] = useState(expense?.locationName ?? '')
    const [notes, setNotes] = useState(expense?.notes ?? '')
    const [localCurrencyReceived, setLocalCurrencyReceived] = useState(
        expense?.localCurrencyReceived?.toFixed(2) ?? ''
    )
    const [coveredParticipants, setCoveredParticipants] = useState<string[]>(
        expense?.coveredParticipants.map((u) => String(u.id)) ?? []
    )
    const [googlePlace, setGooglePlace] = useState<PlaceDetails | null>(() =>
        toPlaceDetails(expense)
    )
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    // Required fields that failed the last submit — outlined red until edited
    const [fieldErrors, setFieldErrors] = useState<
        Partial<Record<InvalidField, boolean>>
    >({})
    const nameInputRef = useRef<HTMLInputElement>(null)
    const costInputRef = useRef<HTMLInputElement>(null)
    const localReceivedInputRef = useRef<HTMLInputElement>(null)
    const [currencyMenuAnchor, setCurrencyMenuAnchor] =
        useState<HTMLElement | null>(null)

    const clearFieldError = (field: InvalidField) => {
        if (!fieldErrors[field]) return
        setFieldErrors((prev) => ({ ...prev, [field]: false }))
        setError('')
    }
    // Track which fields were auto-filled from Google Place (blue highlight until edited)
    const [prefilled, setPrefilled] = useState<{ name: boolean; category: boolean }>({ name: false, category: false })

    const isLegacyTrip = LEGACY_TRIP_IDS.has(String(trip.id))

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

            // Auto-derive location for non-legacy trips. Locations stay
            // city-level ("Tokyo"), not neighborhood-level, so filters don't
            // fragment into wards — the ward only shows as display text.
            if (!isLegacyTrip) {
                const city = derivePlaceCity(place.addressComponents)
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

    // Repopulate when the expense refreshes under us (e.g. after an OCC
    // conflict invalidates the expenses query) so the form shows the latest
    // saved values — mirrors the old drawer behavior.
    useEffect(() => {
        if (mode === 'edit' && expense) {
            setName(expense.name)
            setDate(expense.date)
            setCost(expense.costOriginal.toFixed(2))
            setCurrency(expense.currency)
            setCategoryId(expense.categoryId ?? '')
            setPaidBy(String(expense.paidBy.id))
            if (expense.isEveryone) {
                setSplitBetween(['Everyone'])
            } else {
                setSplitBetween(expense.splitBetween.map((u) => String(u.id)))
            }
            setCoveredParticipants(
                expense.coveredParticipants.map((u) => String(u.id))
            )
            setLocation(expense.locationName ?? '')
            setGooglePlace(toPlaceDetails(expense))
            setNotes(expense.notes ?? '')
            setLocalCurrencyReceived(
                expense.localCurrencyReceived?.toFixed(2) ?? ''
            )
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
            (p) => String(p.id) !== paidBy && splitSet.has(String(p.id))
        )
    }, [trip.participants, splitBetween, isEveryone, paidBy, people])

    const allCovered =
        coverableParticipants.length > 0 &&
        coverableParticipants.every((p) =>
            coveredParticipants.includes(String(p.id))
        )

    const toggleTreatAll = () => {
        setCoveredParticipants(
            allCovered ? [] : coverableParticipants.map((p) => String(p.id))
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

    // Same amount + currency within a day of an existing expense — someone
    // may have logged this bill already. A hint only; never blocks saving.
    const possibleDuplicates = useMemo(
        () =>
            isCurrencyExchange
                ? []
                : findPossibleDuplicates(expenses, {
                      cost: parseFloat(cost),
                      currency,
                      date,
                      excludeId: expense?.id,
                  }),
        [expenses, cost, currency, date, expense?.id, isCurrencyExchange]
    )

    // Currency lives in the cost field's symbol (tap to switch) — most
    // expenses are card charges in USD, so a full picker is wasted space.
    // Currency Exchange keeps its explicit "To currency" picker instead.
    const canPickCurrency =
        !isCurrencyExchange && availableCurrencies.length > 1

    const handleSubmit = async () => {
        const costNum = parseFloat(cost)
        const localReceivedNum = localCurrencyReceived
            ? parseFloat(localCurrencyReceived)
            : undefined

        // Flag every bad required field, then jump to the first one. Focus
        // runs synchronously inside the Add tap, so iOS raises the keyboard.
        const invalid: Record<InvalidField, boolean> = {
            name: !name.trim(),
            cost: !(costNum > 0),
            localReceived: isCurrencyExchange && !(localReceivedNum! > 0),
        }
        const messages: Record<InvalidField, string> = {
            name: 'Add a name for this expense.',
            cost: cost ? 'Enter a valid cost.' : 'Enter the cost.',
            localReceived: 'Enter the local currency amount received.',
        }
        const refs: Record<InvalidField, RefObject<HTMLInputElement | null>> = {
            name: nameInputRef,
            cost: costInputRef,
            localReceived: localReceivedInputRef,
        }
        const firstInvalid = (Object.keys(invalid) as InvalidField[]).find(
            (f) => invalid[f]
        )
        setFieldErrors(invalid)
        if (firstInvalid) {
            setError(messages[firstInvalid])
            const input = refs[firstInvalid].current
            input?.focus({ preventScroll: true })
            input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }
        // Always set in practice (date defaults, payer defaults to you)
        if (!date || !paidBy) {
            setError('Please fill in all required fields.')
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
            // Ids, resolved against this trip's participants server-side
            paid_by_id: paidBy,
            split_everyone: isEveryone || undefined,
            split_between_ids: isEveryone ? undefined : splitBetween,
            covered_participant_ids:
                coveredParticipants.length > 0
                    ? coveredParticipants
                    : undefined,
            // Cleared fields go as null/'' (not undefined) — the PUT only
            // writes fields present in the body, so undefined would keep the
            // old value and an edit could never clear them
            location: location || null,
            notes: notes.trim(),
            local_currency_received: isCurrencyExchange ? localReceivedNum : null,
            google_place_id: googlePlace?.placeId ?? null,
            google_place_name: googlePlace?.name || undefined,
            google_place_address: googlePlace?.address || undefined,
            google_place_lat: googlePlace?.lat || undefined,
            google_place_lng: googlePlace?.lng || undefined,
            google_place_price_level: googlePlace?.priceLevel ?? undefined,
            google_place_price_range: googlePlace?.priceRange ?? undefined,
            google_place_rating: googlePlace?.rating ?? undefined,
            google_place_user_rating_count: googlePlace?.userRatingCount ?? undefined,
            google_place_primary_type: googlePlace?.primaryType ?? undefined,
            google_place_types: googlePlace?.types ?? undefined,
            google_place_website: googlePlace?.website ?? undefined,
            google_place_hours_json: googlePlace?.hoursJson ?? undefined,
            google_place_photo_refs: googlePlace?.photoRefs ?? undefined,
            // Raw components — the area display ("Shibuya, Tokyo") is derived
            // from these at render time, not baked in here.
            google_place_address_components: googlePlace?.addressComponents ?? undefined,
        }

        try {
            const saved =
                mode === 'edit' && expense
                    ? await updateExpense(trip.id, expense.id, {
                          ...payload,
                          expectedUpdatedAt: expense.updatedAt,
                      })
                    : await addExpense(trip.id, payload)
            // Seed the cached list with the saved row before navigating, so the
            // list/detail shows it immediately instead of stale data that pops
            // in when the background refetch lands
            if (saved) {
                queryClient.setQueryData<Expense[]>(
                    queryKeys.trips.expenses(trip.id),
                    (old) =>
                        old &&
                        (old.some((e) => String(e.id) === String(saved.id))
                            ? old.map((e) =>
                                  String(e.id) === String(saved.id) ? saved : e
                              )
                            : [...old, saved])
                )
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
            setSubmitting(false)
        }
        // No reset on success: the page is navigating away, and re-enabling
        // the button in the meantime lets a second tap save a duplicate.
    }

    // Any manual pick clears the late-night default.
    const pickDate = (value: string) => {
        setNightGuardActive(false)
        setDate(value)
    }

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
        <FormPage
            title={isEdit ? 'Edit Expense' : 'Add Expense'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={submitting}
            submitLabel={
                submitting
                    ? isEdit
                        ? 'Saving...'
                        : 'Adding...'
                    : isEdit
                      ? 'Save'
                      : 'Add'
            }>
            {/* 1. Date — week strip: one tap for nearby dates, native
                calendar (via the header summary) for anything else */}
            <FormDateField
                value={date}
                onChange={pickDate}
                required
                headerExtra={
                    // Late-night guard: the form opened between midnight
                    // and 6am, so the date defaulted to yesterday — this
                    // link explains the backdate and flips to today in
                    // one tap. Blue = "the app filled this", same as
                    // place prefills.
                    nightGuardActive ? (
                        <Typography
                            onClick={() => pickDate(isoDaysAgo(0))}
                            role="button"
                            sx={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: colors.primaryBlue,
                                textDecoration: 'underline',
                                lineHeight: 1,
                                cursor: 'pointer',
                                userSelect: 'none',
                            }}>
                            Use today?
                        </Typography>
                    ) : undefined
                }
            />

            {/* 2. Place (Google Places autocomplete) */}
            <Box>
                <Typography sx={labelSx}>Place</Typography>
                <PlaceAutocomplete
                    value={googlePlace}
                    onChange={handlePlaceChange}
                    fallbackRegionCode={trip.countries?.[0]}
                    // The place fills name + category, so cost is usually
                    // the only thing left to type — go straight to it
                    onPick={() => {
                        if (!cost) costInputRef.current?.focus()
                    }}
                />
            </Box>

            {/* 3. Expense name */}
            <Box>
                <Typography sx={fieldErrors.name ? errorLabelSx : labelSx}>
                    Expense name *
                </Typography>
                <TextField
                    placeholder="e.g. Lunch at cafe"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value)
                        clearFieldError('name')
                        if (prefilled.name) setPrefilled((p) => ({ ...p, name: false }))
                    }}
                    required
                    fullWidth
                    size="small"
                    inputRef={nameInputRef}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                    sx={
                        fieldErrors.name
                            ? errorFieldSx
                            : prefilled.name
                              ? prefilledFieldSx
                              : fieldSx
                    }
                />
            </Box>

            {/* 4. Cost (currency in its symbol) + Paid by. Currency
                Exchange adds an explicit "To currency" picker. */}
            <Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            sx={fieldErrors.cost ? errorLabelSx : labelSx}>
                            {isCurrencyExchange ? 'USD paid *' : 'Cost *'}
                        </Typography>
                        <TextField
                            value={cost}
                            inputRef={costInputRef}
                            onChange={(e) => {
                                const v = e.target.value
                                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                    setCost(v)
                                    clearFieldError('cost')
                                }
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
                                    startAdornment: canPickCurrency ? (
                                        // Tap the symbol to switch currency.
                                        // Stretches to the field's full
                                        // height (negative margins eat the
                                        // root padding) for a real tap target;
                                        // mousedown is swallowed so it doesn't
                                        // focus the input and raise the keyboard.
                                        <ButtonBase
                                            aria-label={`Currency: ${currency}. Change`}
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setCurrencyMenuAnchor(
                                                    e.currentTarget
                                                )
                                            }}
                                            sx={{
                                                ...pressTextSx,
                                                alignSelf: 'stretch',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                flexShrink: 0,
                                                margin: '-8.5px 0 -8.5px -14px',
                                                paddingLeft: '14px',
                                                paddingRight: '8px',
                                                borderRight: `1px solid ${colors.primaryBlack}22`,
                                                fontSize: 'inherit',
                                                fontWeight: 600,
                                                color: colors.primaryBlack,
                                            }}>
                                            {currencyMeta.symbol}
                                            <IconChevronDown size={12} />
                                        </ButtonBase>
                                    ) : (
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
                                                : currencyMeta.symbol}
                                        </Box>
                                    ),
                                },
                            }}
                            sx={
                                fieldErrors.cost
                                    ? adornedErrorFieldSx
                                    : adornedFieldSx
                            }
                        />
                        <Menu
                            {...selectMenuProps}
                            anchorEl={currencyMenuAnchor}
                            open={currencyMenuAnchor !== null}
                            onClose={() => setCurrencyMenuAnchor(null)}>
                            {availableCurrencies.map((c) => (
                                <MenuItem
                                    key={c}
                                    selected={c === currency}
                                    onClick={() => {
                                        setCurrency(c)
                                        setCurrencyMenuAnchor(null)
                                    }}>
                                    {formatCurrencyLabel(c)}
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>
                    {/* Currency Exchange: the local-received side — only
                      * foreign currencies. */}
                    {isCurrencyExchange && (
                        <Box sx={{ minWidth: 100 }}>
                            <Typography sx={labelSx}>To currency *</Typography>
                            <FormControl size="small" fullWidth>
                                <Select
                                    value={currency}
                                    onChange={(e) =>
                                        setCurrency(e.target.value)
                                    }
                                    MenuProps={selectMenuProps}
                                    sx={fieldSx}>
                                    {foreignCurrencies.map((c) => (
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
                                        (u) => String(u.id) === val
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
                                        value={String(p.id)}
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

            {/* Possible duplicate — informational, never blocks: two equal
                charges can be legit, so adding stays one tap */}
            {possibleDuplicates.length > 0 &&
                (() => {
                    const [first] = possibleDuplicates
                    const more = possibleDuplicates.length - 1
                    return (
                        <Box
                            role="status"
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1,
                                paddingX: '10px',
                                paddingY: 1,
                                backgroundColor: colors.secondaryYellow,
                                border: `1px solid ${colors.primaryBlack}`,
                                borderRadius: '4px',
                            }}>
                            <IconCopy
                                size={16}
                                color={colors.primaryBlack}
                                style={{ flexShrink: 0, marginTop: 1 }}
                            />
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    lineHeight: 1.4,
                                    color: colors.primaryBlack,
                                    minWidth: 0,
                                }}>
                                Same amount as{' '}
                                <Box component="span" sx={{ fontWeight: 600 }}>
                                    {first.name}
                                </Box>{' '}
                                ({first.paidBy.firstName},{' '}
                                {dayjs(first.date).format('MMM D')})
                                {more > 0 && ` and ${more} more`}. Already
                                logged?
                            </Typography>
                        </Box>
                    )
                })()}

            {/* 5. Local currency received (currency exchange only) */}
            {isCurrencyExchange &&
                (() => {
                    const localMeta = getCurrencyMeta(currency)
                    return (
                        <Box>
                            <Typography
                                sx={
                                    fieldErrors.localReceived
                                        ? errorLabelSx
                                        : labelSx
                                }>{`Local currency received (${currency}) *`}</Typography>
                            <TextField
                                value={localCurrencyReceived}
                                inputRef={localReceivedInputRef}
                                onChange={(e) => {
                                    const v = e.target.value
                                    if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                        setLocalCurrencyReceived(v)
                                        clearFieldError('localReceived')
                                    }
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
                                sx={
                                    fieldErrors.localReceived
                                        ? adornedErrorFieldSx
                                        : adornedFieldSx
                                }
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
                            backgroundColor: colors.primaryWhite,
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
                            isEveryone || splitBetween.includes(String(p.id))
                        const isPayer = String(p.id) === paidBy
                        const isCovered = coveredParticipants.includes(
                            String(p.id)
                        )
                        return (
                            <Box
                                key={p.id}
                                onClick={() => toggleRow(String(p.id))}
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
                                        toggleCovered(String(p.id))
                                    )}
                            </Box>
                        )
                    })}
                </Box>
            </Box>

            {/* 7. Category */}
            <Box>
                <Typography sx={labelSx}>Category</Typography>
                <CategoryPicker
                    categories={sortedCategories}
                    value={categoryId}
                    onChange={(id) => {
                        setCategoryId(id)
                        if (prefilled.category)
                            setPrefilled((p) => ({ ...p, category: false }))
                    }}
                    isPending={categoriesPending}
                    isAutoFilled={prefilled.category}
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

            </FormPage>
    )
}
