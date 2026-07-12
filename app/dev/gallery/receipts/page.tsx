'use client'

import { useState } from 'react'

import { ExpenseRow } from 'components/receipts/expense-row'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { GalleryPage, SpecimenGroup, Specimen } from '../gallery-ui'
import { expenses } from '../fixtures'

const noop = () => {}

export default function ReceiptsGallery() {
    const [collapsed, setCollapsed] = useState(false)
    const [usd, jpy, longName, error] = expenses

    return (
        <GalleryPage title="Receipts">
            <SpecimenGroup title="ExpenseRow">
                <Specimen label="default (USD)">
                    <ExpenseRow expense={usd} onTap={noop} />
                </Specimen>
                <Specimen label="foreign currency (JPY)">
                    <ExpenseRow expense={jpy} onTap={noop} />
                </Specimen>
                <Specimen label="long name — truncation">
                    <ExpenseRow expense={longName} onTap={noop} />
                </Specimen>
                <Specimen label="conversion error">
                    <ExpenseRow expense={error} onTap={noop} />
                </Specimen>
                <Specimen label="hideDate (grouped view)">
                    <ExpenseRow expense={usd} onTap={noop} hideDate />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="DateGroupHeader">
                <Specimen label={`interactive — ${collapsed ? 'collapsed' : 'expanded'} (click)`}>
                    <DateGroupHeader
                        date="2026-07-04"
                        dayTotal={247}
                        dayNumber={3}
                        totalDays={10}
                        expenseCount={4}
                        collapsed={collapsed}
                        onToggle={() => setCollapsed((c) => !c)}
                    />
                </Specimen>
                <Specimen label="outside trip range (no day label)">
                    <DateGroupHeader
                        date="2026-06-30"
                        dayTotal={89}
                        dayNumber={null}
                        totalDays={null}
                        expenseCount={1}
                        collapsed={false}
                        onToggle={noop}
                    />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
