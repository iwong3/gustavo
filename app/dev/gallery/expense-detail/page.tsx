'use client'

import { Box } from '@mui/material'
import { useState } from 'react'

import { CategoryPicker } from 'components/category-picker'
import { DrawerHeader } from 'components/receipts/drawer/drawer-header'
import { DrawerMapSection } from 'components/receipts/drawer/drawer-map-section'
import { DrawerMetadataFooter } from 'components/receipts/drawer/drawer-metadata-footer'
import { DrawerNotes } from 'components/receipts/drawer/drawer-notes'
import { DrawerReceipt } from 'components/receipts/drawer/drawer-receipt'
import { DrawerStatTiles } from 'components/receipts/drawer/drawer-stat-tiles'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'
import {
    currentUserId,
    expenses,
    ivan,
    jenny,
    kyotoPlace,
    legacyPlace,
    makeExpense,
    marco,
    participants,
    priya,
    shibuyaPlace,
    trip,
} from '../fixtures'

import type { Expense } from '@/lib/types'

const noop = () => {}

/** Mirrors the real page: the provider's getUsdValue, which returns 0 for rows
 *  Google couldn't convert (costConvertedUsd arrives null at runtime). */
const getUsdValue = (e: Expense) =>
    Number.isFinite(e.costConvertedUsd) ? e.costConvertedUsd : 0

// [usd, jpy, longName, error, ramen(shibuya), donki(legacy)]
const [usd, , , conversionError, ramen] = expenses

const soloUsd = makeExpense({
    name: 'Airport coffee',
    costOriginal: 6.5,
    costConvertedUsd: 6.5,
    paidBy: ivan,
    splitBetween: [ivan],
    isEveryone: false,
})

const treatedJpy = makeExpense({
    name: 'Ichiran Ramen',
    costOriginal: 4200,
    currency: 'JPY',
    costConvertedUsd: 28.5,
    exchangeRate: 147.4,
    paidBy: jenny,
    splitBetween: participants,
    coveredParticipants: [priya, marco],
    isEveryone: true,
})

/** Stored inside out on purpose — that IS the shape: costOriginal is the USD
 *  paid, `currency` is what was RECEIVED (lib/spend.ts). Guards the receipt
 *  against printing "¥200" for $200. */
const exchange = makeExpense({
    name: 'Yen at the airport',
    categoryName: 'Currency Exchange',
    categorySlug: 'currency_exchange',
    costOriginal: 200,
    currency: 'JPY',
    costConvertedUsd: 200,
    localCurrencyReceived: 28800,
    paidBy: ivan,
    splitBetween: [ivan],
    isEveryone: false,
})

/** Mirrors the form's ordering: usage desc, "Other" last. Includes a
 *  deliberately long custom name — categories are user-editable. */
const pickerCategories = [
    { id: 1, name: 'Food', count: 14 },
    { id: 2, name: 'Transit', count: 12 },
    { id: 3, name: 'Attraction', count: 6 },
    { id: 4, name: 'Shopping', count: 5 },
    { id: 5, name: 'Lodging', count: 4 },
    { id: 6, name: 'Currency Exchange', count: 2 },
    { id: 7, name: 'Souvenirs & Gifts for the folks back home', count: 0 },
    { id: 8, name: 'Other', count: 3 },
]

export default function ExpenseDetailGallery() {
    const [pickedCategory, setPickedCategory] = useState<number | ''>(1)

    return (
        <GalleryPage title="Expense detail">
            <SpecimenGroup title="CategoryPicker (expense form)">
                <Specimen
                    label={`interactive — tap to select, tap again to clear (value: ${pickedCategory || 'none'})`}>
                    <CategoryPicker
                        categories={pickerCategories}
                        value={pickedCategory}
                        onChange={setPickedCategory}
                    />
                </Specimen>
                <Specimen label="Google-inferred — AUTO badge + blue prefill border">
                    <CategoryPicker
                        categories={pickerCategories.slice(0, 5)}
                        value={1}
                        onChange={noop}
                        isAutoFilled
                    />
                </Specimen>
                <Specimen label="loading — placeholder keeps the box from collapsing to a 2px line">
                    <CategoryPicker categories={[]} value="" onChange={noop} isPending />
                </Specimen>
                <Specimen label="empty (query resolved, nothing returned)">
                    <CategoryPicker categories={[]} value="" onChange={noop} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="DrawerHeader">
                <Specimen label="with place — area reads “Shibuya, Tokyo”">
                    <DrawerHeader expense={ramen} dayNumber={4} totalDays={12} />
                </Specimen>
                <Specimen label="no place, outside trip range (no day label)">
                    <DrawerHeader expense={usd} dayNumber={null} totalDays={null} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="DrawerReceipt">
                <Specimen label="USD, split 2 — no rate lines">
                    <DrawerReceipt
                        expense={usd}
                        costUsd={42.5}
                        currentUserId={currentUserId}
                        tripParticipantCount={participants.length}
                        expenseIndex={16}
                        totalExpenses={32}
                        dayNumber={3}
                        totalDays={12}
                    />
                </Specimen>
                <Specimen label="JPY, everyone, 2 treated — payer carries their share + both treats; column sums to TOTAL">
                    <DrawerReceipt
                        expense={treatedJpy}
                        costUsd={28.5}
                        currentUserId={currentUserId}
                        tripParticipantCount={participants.length}
                        expenseIndex={4}
                        totalExpenses={32}
                        dayNumber={4}
                        totalDays={12}
                    />
                </Specimen>
                <Specimen label="solo — “Not split”, no per-head line, you are the payer">
                    <DrawerReceipt
                        expense={soloUsd}
                        costUsd={6.5}
                        currentUserId={currentUserId}
                        tripParticipantCount={participants.length}
                        expenseIndex={0}
                        totalExpenses={32}
                        dayNumber={1}
                        totalDays={12}
                    />
                </Specimen>
                <Specimen label="conversion error — no boba, red total">
                    <DrawerReceipt
                        expense={conversionError}
                        costUsd={0}
                        currentUserId={currentUserId}
                        tripParticipantCount={participants.length}
                        expenseIndex={9}
                        totalExpenses={32}
                        dayNumber={5}
                        totalDays={12}
                    />
                </Specimen>
                <Specimen label="currency exchange — adds a RECEIVED line">
                    <DrawerReceipt
                        expense={exchange}
                        costUsd={200}
                        currentUserId={currentUserId}
                        tripParticipantCount={participants.length}
                        expenseIndex={1}
                        totalExpenses={32}
                        dayNumber={1}
                        totalDays={12}
                    />
                </Specimen>
                <Specimen label="unknown position (empty list)">
                    <DrawerReceipt
                        expense={usd}
                        costUsd={42.5}
                        currentUserId={currentUserId}
                        tripParticipantCount={participants.length}
                        expenseIndex={-1}
                        totalExpenses={0}
                        dayNumber={null}
                        totalDays={null}
                    />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="DrawerMapSection">
                <Specimen label="full metadata — rating+count, price range, type, both buttons">
                    <DrawerMapSection place={shibuyaPlace} />
                </Specimen>
                <Specimen label="sparse — no rating/price/website, Maps button only">
                    <DrawerMapSection place={kyotoPlace} />
                </Specimen>
                <Specimen label="pre-00039 place — no priceRange, falls back to $$ price level">
                    <DrawerMapSection place={legacyPlace} />
                </Specimen>
                <Specimen label="no coordinates — chips drop below the bar, no embed">
                    <DrawerMapSection place={{ ...shibuyaPlace, lat: null, lng: null }} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="DrawerStatTiles">
                <Specimen label="all three tiles">
                    <DrawerStatTiles
                        expense={ramen}
                        costUsd={28.5}
                        allExpenses={expenses}
                        getUsdValue={getUsdValue}
                    />
                </Specimen>
                <Specimen label="$0 / unconvertible — renders nothing">
                    <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                        <DrawerStatTiles
                            expense={conversionError}
                            costUsd={0}
                            allExpenses={expenses}
                            getUsdValue={getUsdValue}
                        />
                        (nothing above this line)
                    </Box>
                </Specimen>
                <Specimen label="lone expense — no rank, no category peers">
                    <DrawerStatTiles
                        expense={usd}
                        costUsd={42.5}
                        allExpenses={[usd]}
                        getUsdValue={getUsdValue}
                    />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="DrawerNotes / DrawerMetadataFooter">
                <Specimen label="notes — tappable to edit">
                    <DrawerNotes notes={ramen.notes} onEdit={noop} />
                </Specimen>
                <Specimen label="notes — read-only (no edit permission)">
                    <DrawerNotes notes={ramen.notes} />
                </Specimen>
                <Specimen label="attribution footer">
                    <DrawerMetadataFooter expense={ramen} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Full page — assembled in real order">
                <Specimen label={`${trip.name} · Ichiran Ramen`}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', paddingY: 1.5 }}>
                        <DrawerHeader expense={ramen} dayNumber={4} totalDays={12} />
                        <DrawerReceipt
                            expense={ramen}
                            costUsd={28.5}
                            currentUserId={currentUserId}
                            tripParticipantCount={participants.length}
                            expenseIndex={16}
                            totalExpenses={32}
                            dayNumber={4}
                            totalDays={12}
                        />
                        <DrawerMapSection place={shibuyaPlace} />
                        <DrawerStatTiles
                            expense={ramen}
                            costUsd={28.5}
                            allExpenses={expenses}
                            getUsdValue={getUsdValue}
                        />
                        <DrawerNotes notes={ramen.notes} onEdit={noop} />
                        <DrawerMetadataFooter expense={ramen} />
                    </Box>
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
