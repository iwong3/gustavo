'use client'

/**
 * Gallery: render-cost harness. The Insights page and the Expenses list over
 * a realistic 150-expense trip, wrapped in a React Profiler that logs every
 * commit to `window.__perf` — for measuring tap → commit cost without auth.
 *
 * Measure from the console (or javascript_tool):
 *   __perf.reset(); <click something>; await __perf.settle()
 * → { commits, renderMs, wallMs } where wallMs runs from reset to the last
 * commit (so includes deferred/transition renders).
 */
import { Box, Button } from '@mui/material'
import { Profiler, useState, type ProfilerOnRenderCallback } from 'react'

import type { Expense } from '@/lib/types'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { RefreshProvider } from 'providers/refresh-provider'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'

import MySpendPage from '../../../gustavo/trips/[slug]/graphs/page'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'
import { ivan, jenny, makeExpense, marco, participants, priya, trip } from '../fixtures'

const CATEGORIES = ['Food', 'Transit', 'Lodging', 'Attraction', 'Shopping', 'Groceries', 'Nightlife']
const PLACES = ['Tokyo', 'Tokyo', 'Kyoto', 'Osaka', 'Nara']
const PAYERS = [ivan, jenny, marco, priya]

/** 150 expenses over the fixture trip's 10 days, deterministic. */
const perfExpenses: Expense[] = Array.from({ length: 150 }, (_, i) => {
    const day = 2 + (i % 10)
    const cost = 8 + ((i * 37) % 180)
    return makeExpense({
        name: `${CATEGORIES[i % CATEGORIES.length]} stop #${i + 1}`,
        date: `2026-07-${String(day).padStart(2, '0')}`,
        categoryName: CATEGORIES[i % CATEGORIES.length],
        locationName: PLACES[Math.floor(i / 30) % PLACES.length],
        costConvertedUsd: cost,
        costOriginal: cost,
        paidBy: PAYERS[i % PAYERS.length],
        isEveryone: i % 3 !== 0,
        splitBetween: i % 3 !== 0 ? participants : [ivan, jenny],
    })
})

type Commit = { id: string; phase: string; actualMs: number; at: number }
type PerfApi = {
    commits: Commit[]
    t0: number
    reset: () => void
    settle: (quietMs?: number) => Promise<{ commits: number; renderMs: number; wallMs: number }>
}

function perfApi(): PerfApi {
    const w = window as unknown as { __perf?: PerfApi }
    if (!w.__perf) {
        const api: PerfApi = {
            commits: [],
            t0: 0,
            reset() {
                api.commits = []
                api.t0 = performance.now()
            },
            // Resolves once no commit has landed for `quietMs`
            async settle(quietMs = 400) {
                let seen = -1
                while (seen !== api.commits.length) {
                    seen = api.commits.length
                    await new Promise((r) => setTimeout(r, quietMs))
                }
                const last = api.commits[api.commits.length - 1]
                return {
                    commits: api.commits.length,
                    renderMs: Math.round(api.commits.reduce((s, c) => s + c.actualMs, 0)),
                    wallMs: last ? Math.round(last.at - api.t0) : 0,
                }
            },
        }
        w.__perf = api
    }
    return w.__perf
}

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    // performance.now() here ≈ end of this commit's render phase
    perfApi().commits.push({ id, phase, actualMs: actualDuration, at: performance.now() })
}

export default function PerfGalleryPage() {
    const [view, setView] = useState<'none' | 'insights' | 'expenses'>('none')
    return (
        <GalleryPage title="Perf harness">
            <SpecimenGroup title="150 expenses — mount a view, then measure with window.__perf">
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    {(['none', 'insights', 'expenses'] as const).map((v) => (
                        <Button key={v} data-view={v} variant={view === v ? 'contained' : 'outlined'} onClick={() => setView(v)}>
                            {v}
                        </Button>
                    ))}
                </Box>
                <Specimen label={view}>
                    <Profiler id="perf" onRender={onRender}>
                        <TripDataProvider expenses={perfExpenses} trip={trip}>
                            <SpendDataProvider>
                                <RefreshProvider onRefresh={() => {}}>
                                    {view === 'insights' && <MySpendPage />}
                                    {view === 'expenses' && <ReceiptsList />}
                                </RefreshProvider>
                            </SpendDataProvider>
                        </TripDataProvider>
                    </Profiler>
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
