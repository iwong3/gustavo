'use client'

/**
 * Gallery specimens for the Supplements page: today's tiles, the calendar
 * with stack-change badges, and the day panel — live on local state, built
 * with the page's own history model (lib/health/supplement-calendar.ts) from
 * the redesign's sample stack. Late-night (1am) state included.
 */
import { Box } from '@mui/material'
import { useMemo, useState } from 'react'

import { cardSx, colors } from '@/lib/colors'
import type { Supplement, SupplementEvent, SupplementLog } from '@/lib/health-types'
import { buildSupplementHistory } from '@/lib/health/supplement-calendar'
import { addDose, buildStack, removeDose } from '@/lib/health/supplement-stack'
import { NightLine, type NightNote } from 'components/health/supplements/night-line'
import { SupplementCalendar } from 'components/health/supplements/supplement-calendar'
import { SupplementDayPanel } from 'components/health/supplements/supplement-day-panel'
import { SupplementTiles } from 'components/health/supplements/supplement-tiles'
import type { DoseTarget } from 'hooks/use-supplement-dose'

import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

const TODAY = '2026-09-28'

const supp = (id: number, name: string, dosage: string | null, dailyDoses: number | null, isActive = true): Supplement => ({
    id,
    name,
    dosage,
    isActive,
    dailyDoses,
})
const SUPPLEMENTS: Supplement[] = [
    supp(1, 'Creatine', '5 g', 1),
    supp(2, 'Magnesium', '400 mg', 1),
    supp(3, 'Omega-3', '1 g', 2),
    supp(4, 'Probiotic', null, 1),
    supp(5, 'Vitamin D3', '2000 IU', 1),
    supp(6, 'Zinc', '30 mg', 1),
    supp(7, 'Melatonin', '3 mg', null),
    supp(8, 'Ashwagandha', null, null, false),
]

let eid = 1
const ev = (
    supplementId: number,
    date: string,
    kind: SupplementEvent['kind'],
    dailyDoses: number | null = null,
    recorded = date
): SupplementEvent => ({ id: eid++, supplementId, date, kind, dailyDoses, recordedAt: `${recorded}T18:00:00Z` })
const EVENTS: SupplementEvent[] = [
    ev(1, '2026-03-03', 'started', 1, '2026-08-01'), // backdated: vouched through Aug 1
    ev(2, '2026-08-20', 'started', 1),
    ev(3, '2026-05-02', 'started', 1, '2026-08-01'),
    ev(3, '2026-06-01', 'dose_changed', 2),
    ev(4, '2026-09-14', 'started', 1),
    ev(5, '2026-01-12', 'started', 1, '2026-08-01'),
    ev(6, '2026-04-01', 'started', 1),
    ev(6, '2026-07-18', 'stopped'),
    ev(6, '2026-09-22', 'started', 1),
    ev(7, '2026-06-01', 'started', null),
    ev(8, '2026-02-03', 'started', 1),
    ev(8, '2026-03-20', 'stopped'),
]

function buildLogs(): SupplementLog[] {
    const logs: SupplementLog[] = []
    let id = 1
    const add = (supplementId: number, date: string, quantity = 1) =>
        logs.push({ id: id++, supplementId, supplementName: '', date, quantity, createdAt: `${date}T12:00:00Z` })
    const d = new Date('2026-08-01T00:00:00')
    for (;;) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (iso >= TODAY) break
        const day = iso >= '2026-09-01' ? Number(iso.slice(8)) : 0
        const travel = iso === '2026-09-11'
        if (!travel) {
            add(1, iso)
            add(5, iso)
            add(3, iso, iso === '2026-09-05' ? 1 : 2)
        }
        const magOn = (iso >= '2026-08-20' && iso <= '2026-09-03') || (day >= 16 && day !== 24)
        if (magOn) add(2, iso)
        if (day >= 14) add(4, iso)
        if (day >= 22) add(6, iso)
        if (iso === '2026-09-26') add(7, iso)
        d.setDate(d.getDate() + 1)
    }
    // Today so far: 3 of 7
    add(1, TODAY)
    add(3, TODAY)
    add(5, TODAY)
    const names = new Map(SUPPLEMENTS.map((s) => [s.id, s.name]))
    return logs.map((l) => ({ ...l, supplementName: names.get(l.supplementId) ?? '' }))
}

/** The page's Today + calendar composition, on local state. */
function LiveSupplements({ nightNote, initialSelected = null }: { nightNote?: NightNote; initialSelected?: string | null }) {
    const [logs, setLogs] = useState(buildLogs)
    const [selected, setSelected] = useState<string | null>(initialSelected)
    const [month, setMonth] = useState(TODAY.slice(0, 7))

    const history = useMemo(
        () =>
            buildSupplementHistory({
                supplements: SUPPLEMENTS,
                events: EVENTS,
                logs,
                today: TODAY,
                recordedOn: (iso) => iso.slice(0, 10),
            }),
        [logs]
    )
    const tiles = buildStack(SUPPLEMENTS, logs.filter((l) => l.date === TODAY)).map((i) => ({
        ...i,
        dosage: SUPPLEMENTS.find((s) => s.id === i.supplementId)?.dosage ?? null,
        dayOfRun: history.dayOfRun(i.supplementId, TODAY),
    }))

    const tapOn = (date: string) => (t: DoseTarget) =>
        setLogs((cur) =>
            t.taken >= t.dosesPerDay
                ? removeDose(cur, t.supplementId, date)
                : addDose(cur, { id: t.supplementId, name: t.name }, date, -Date.now())
        )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2, backgroundColor: colors.secondaryYellow }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {nightNote && <NightLine note={nightNote} />}
                <SupplementTiles tiles={tiles} onTap={tapOn(TODAY)} />
            </Box>
            <Box sx={{ ...cardSx, borderRadius: '8px', overflow: 'hidden' }}>
                <SupplementCalendar
                    month={month}
                    summaryOn={history.summaryOn}
                    today={TODAY}
                    selected={selected}
                    onSelect={setSelected}
                    onPrevMonth={month > '2026-07' ? () => setMonth(month === '2026-09' ? '2026-08' : '2026-07') : undefined}
                    onNextMonth={month < '2026-09' ? () => setMonth(month === '2026-07' ? '2026-08' : '2026-09') : undefined}
                />
                {selected && (
                    <SupplementDayPanel
                        date={selected}
                        isPast={selected < TODAY}
                        summary={history.summaryOn(selected)}
                        changes={history.changesOn(selected)}
                        rows={history.rowsOn(selected)}
                        onTapRow={tapOn(selected)}
                        onEdit={() => {}}
                    />
                )}
            </Box>
        </Box>
    )
}

export default function SupplementsGallery() {
    return (
        <GalleryPage title="Supplements">
            <SpecimenGroup title="Today + calendar (sample stack, Mon Sep 28)">
                <Specimen label="Sep 14 open — Probiotic started; tap tiles / days / rows">
                    <LiveSupplements initialSelected="2026-09-14" />
                </Specimen>
                <Specimen label="Sep 24 open — Magnesium missed, one tap fixes it">
                    <LiveSupplements initialSelected="2026-09-24" />
                </Specimen>
                <Specimen label="1am — counting for Monday">
                    <LiveSupplements
                        nightNote={{ text: 'Counting for Monday until 6 AM.', action: 'Log for Tue', onAction: () => {} }}
                    />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
