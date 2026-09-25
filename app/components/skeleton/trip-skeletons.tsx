'use client'

import { Box } from '@mui/material'
import { usePathname } from 'next/navigation'

import { cardSx, colors, toneColors } from '@/lib/colors'
import { Bone, ChromeBox, Circle, TextBone } from 'components/skeleton/bones'
import { FormSkeleton } from 'components/skeleton/form-skeleton'

// Loading placeholders for the trips area — one per page, each mirroring the
// loaded page's container, paddings and block sizes (see the comment on each
// for the component it mirrors). Used by the route loading.tsx files AND by
// the pages' own loading states, so a slow load never swaps one placeholder
// for another.

const ROW_DIVIDER = '1px solid rgba(0, 0, 0, 0.12)' // theme divider

/**
 * Mirrors PageTitleRow: 16px title left; right-side controls as bones of
 * the given widths (30 = ⓘ circle), plus `chrome` 30px outlined buttons.
 */
function TitleRowSkeleton({ width, controls, chrome = 0 }: { width: number; controls: number[]; chrome?: number }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 }}>
            <TextBone fontSize={16} width={width} />
            <Box sx={{ display: 'flex', gap: 1 }}>
                {controls.map((w, i) =>
                    w === 30 ? <Circle key={i} size={30} /> : <Bone key={i} width={w} height={30} radius="15px" />
                )}
                {Array.from({ length: chrome }, (_, i) => (
                    <ChromeBox key={`c${i}`} width={30} height={30} />
                ))}
            </Box>
        </Box>
    )
}

// ── Trips list ──────────────────────────────────────────────────────────────

/** Mirrors BoardingPass (components/boarding-pass.tsx). */
export function BoardingPassSkeleton() {
    return (
        <Box
            sx={{
                ...cardSx,
                borderRadius: '8px',
                overflow: 'hidden',
                width: '100%',
            }}>
            {/* Header strip */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 34,
                    paddingX: 1.75,
                    paddingY: 0.5,
                    backgroundColor: colors.secondaryYellow,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                }}>
                <TextBone fontSize={10.5} width={92} />
                <TextBone fontSize={9} width={56} />
            </Box>
            {/* Body: name, then Dates / Passengers / Total fields */}
            <Box sx={{ paddingX: 1.75, paddingTop: 1.25, paddingBottom: 1.5 }}>
                <TextBone fontSize={20} lineHeight={1.15} width="55%" />
                <Box sx={{ display: 'flex', gap: 2.25, marginTop: 1.25 }}>
                    <Box>
                        <TextBone fontSize={9} width={34} />
                        <Bone width={104} height={24} sx={{ marginTop: 0.5 }} />
                    </Box>
                    <Box>
                        <TextBone fontSize={9} width={62} />
                        <Box sx={{ display: 'flex', marginTop: 0.5 }}>
                            {[0, 1, 2].map((i) => (
                                <Box key={i} sx={{ marginLeft: i === 0 ? 0 : '-5px' }}>
                                    <Circle size={24} />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    <Box sx={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <TextBone fontSize={9} width={30} />
                        <Bone width={52} height={24} sx={{ marginTop: 0.5 }} />
                    </Box>
                </Box>
            </Box>
            {/* Perforation + stub */}
            <Box sx={{ borderTop: `2px dashed ${colors.primaryBlack}`, opacity: 0.85 }} />
            <Box sx={{ paddingX: 1.75, paddingY: 1.25 }}>
                <TextBone fontSize={12} width={140} />
            </Box>
        </Box>
    )
}

/** Mirrors the trips list (app/gustavo/trips/page.tsx): section title + passes. */
export function TripsListSkeleton() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                paddingX: 4,
                paddingY: 2,
            }}>
            <TextBone fontSize={24} width={150} sx={{ alignSelf: 'flex-start', marginBottom: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                {[0, 1, 2].map((i) => (
                    <BoardingPassSkeleton key={i} />
                ))}
            </Box>
        </Box>
    )
}

/** Mirrors TripsMap (components/trips-map.tsx) on the map page. */
export function TripsMapSkeleton() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                width: '100%',
                maxWidth: 720,
                height: '100%',
                paddingX: 1.5,
                paddingY: 2,
            }}>
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Circle size={26} />
                    <TextBone fontSize={26} lineHeight={1.15} width={180} />
                </Box>
                <TextBone fontSize={13} width={220} sx={{ marginTop: 0.5 }} />
            </Box>
            <Bone height="auto" radius="8px" sx={{ flex: 1, minHeight: 180 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
                {[0, 1, 2, 3].map((i) => (
                    <Bone key={i} height={56} radius="6px" sx={{ flex: 1 }} />
                ))}
            </Box>
        </Box>
    )
}

// ── Expenses ────────────────────────────────────────────────────────────────

/** Mirrors ExpenseRow (components/receipts/expense-row.tsx). */
function ExpenseRowSkeleton({ divider }: { divider: boolean }) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                paddingX: 1.5,
                paddingY: 1.5,
                borderBottom: divider ? ROW_DIVIDER : 'none',
            }}>
            <Circle size={28} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <TextBone fontSize={14} lineHeight={1.3} width="62%" />
                <TextBone fontSize={12} lineHeight={1.3} width="36%" sx={{ marginTop: 0.25 }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                <TextBone fontSize={14} lineHeight={1.2} width={52} />
                <Circle size={20} />
            </Box>
        </Box>
    )
}

/** Mirrors a date group: DateGroupHeader + rows, in a card. */
function ExpenseGroupSkeleton({ rows }: { rows: number }) {
    return (
        <Box sx={{ marginX: 2, marginBottom: 1.5 }}>
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingX: 2,
                        paddingY: 1,
                        backgroundColor: '#d4ddb6', // DateGroupHeader
                        borderBottom: `1px solid ${colors.primaryBlack}`,
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16 }} />
                        <Box>
                            <TextBone fontSize={13} lineHeight={1.3} width={124} />
                            <TextBone fontSize={11} lineHeight={1.3} width={112} />
                        </Box>
                    </Box>
                    <TextBone fontSize={13} width={46} />
                </Box>
                {Array.from({ length: rows }, (_, i) => (
                    <ExpenseRowSkeleton key={i} divider={i < rows - 1} />
                ))}
            </Box>
        </Box>
    )
}

/**
 * Mirrors the expenses page: TripToolbar (search + refine, 58px) and the
 * grouped receipts list.
 */
export function ExpensesPageSkeleton() {
    return (
        <Box sx={{ width: '100%', maxWidth: 450 }}>
            <Box sx={{ display: 'flex', gap: 1, paddingX: 2, paddingTop: 1, paddingBottom: 2 }}>
                <ChromeBox height={34} sx={{ flex: 1 }} />
                <ChromeBox width={34} height={34} />
            </Box>
            <ExpenseGroupSkeleton rows={3} />
            <ExpenseGroupSkeleton rows={2} />
            <ExpenseGroupSkeleton rows={2} />
        </Box>
    )
}

/**
 * Mirrors the expense detail: DrawerHeader, the paper receipt, stat tiles.
 */
export function ExpenseDetailSkeleton() {
    return (
        <Box sx={{ width: '100%', maxWidth: 450, paddingTop: 1.5, paddingBottom: 1 }}>
            {/* DrawerHeader */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, paddingX: 2.5, paddingTop: 1, paddingBottom: 1.5 }}>
                <Circle size={46} />
                <Box sx={{ flex: 1 }}>
                    <TextBone fontSize={18} lineHeight={1.3} width="65%" />
                    <TextBone fontSize={12} lineHeight={1.4} width="45%" />
                </Box>
            </Box>
            {/* Receipt paper */}
            <Box
                sx={{
                    marginX: 2.5,
                    marginBottom: 2,
                    padding: '12px 16px',
                    backgroundColor: colors.primaryWhite,
                    boxShadow: '0 3px 0 rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}>
                <TextBone fontSize={10} width="40%" sx={{ alignSelf: 'center' }} />
                {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <TextBone fontSize={12} lineHeight={1.7} width="45%" />
                        <TextBone fontSize={12} lineHeight={1.7} width={56} />
                    </Box>
                ))}
                <Box sx={{ borderTop: `1px dashed ${colors.primaryBlack}40`, marginY: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <TextBone fontSize={16} lineHeight={1.7} width={70} />
                    <TextBone fontSize={16} lineHeight={1.7} width={72} />
                </Box>
                {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 31 }}>
                        <Circle size={22} />
                        <TextBone fontSize={12} width="40%" />
                    </Box>
                ))}
                <Bone height={26} sx={{ marginTop: 1 }} />
            </Box>
            {/* Stat tiles */}
            <Box sx={{ display: 'flex', gap: 1, marginX: 2.5, marginBottom: 2 }}>
                {[0, 1, 2].map((i) => (
                    <Bone key={i} height={53} radius="4px" sx={{ flex: 1 }} />
                ))}
            </Box>
        </Box>
    )
}

// ── Debts ───────────────────────────────────────────────────────────────────

/** Title row (title + 30px controls) over a PersonSwitcher of 40px avatars. */
function TitleWithPeopleSkeleton({ gap }: { gap: number }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap }}>
            <TitleRowSkeleton width={140} controls={[64, 30]} />
            <Box sx={{ display: 'flex', gap: 1 }}>
                {[0, 1, 2, 3].map((i) => (
                    <Circle key={i} size={40} />
                ))}
            </Box>
        </Box>
    )
}

/** Mirrors the debts page (app/gustavo/trips/[slug]/debts/page.tsx). */
export function DebtsSkeleton() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 450, paddingX: 2, paddingY: 2 }}>
            <TitleWithPeopleSkeleton gap={1.25} />
            {/* StatBoxes */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                {[toneColors.negativeBg, toneColors.positiveBg].map((bg) => (
                    <Box key={bg} sx={{ ...cardSx, flex: 1, backgroundColor: bg, paddingX: 1.5, paddingY: 1 }}>
                        <TextBone fontSize={22} lineHeight={1.1} width="60%" />
                        <TextBone fontSize={10.5} width="70%" sx={{ marginTop: 0.25 }} />
                        <Box sx={{ display: 'flex', gap: 0.5, minHeight: 22, marginTop: 0.5 }}>
                            <Circle size={22} />
                            <Circle size={22} />
                        </Box>
                    </Box>
                ))}
            </Box>
            {/* Money map */}
            <TextBone fontSize={11} width={110} />
            <Bone height={280} radius="4px" />
            {/* Settle up */}
            <TextBone fontSize={11} width={80} />
            <Bone height={87} radius="4px" />
            {[0, 1].map((i) => (
                <Bone key={i} height={48} radius="4px" />
            ))}
        </Box>
    )
}

/** Mirrors the pair drill-down (components/debt/pair-detail.tsx). */
export function DebtPairSkeleton() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 450, paddingX: 2, paddingY: 2 }}>
            {/* Hero */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 1.75,
                    backgroundColor: colors.primaryWhite,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                    borderRadius: '4px',
                }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Circle size={32} />
                        <Bone width={14} height={10} />
                        <Circle size={32} />
                    </Box>
                    <TextBone fontSize={12} width={110} sx={{ marginTop: 0.75 }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <TextBone fontSize={30} lineHeight={1.1} width={96} />
                    <TextBone fontSize={11.5} width={70} />
                </Box>
            </Box>
            {/* ListControls + toggle */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <ChromeBox height={34} sx={{ flex: 1 }} />
                <ChromeBox width={88} height={34} />
            </Box>
            <ChromeBox height={34} />
            {/* Rows */}
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                {[0, 1, 2, 3].map((i) => (
                    <Box
                        key={i}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            paddingX: 1.25,
                            paddingY: 1,
                            borderBottom: i < 3 ? ROW_DIVIDER : 'none',
                        }}>
                        <Circle size={28} />
                        <Box sx={{ flex: 1 }}>
                            <TextBone fontSize={13} lineHeight={1.3} width="55%" />
                            <TextBone fontSize={11} lineHeight={1.3} width="35%" />
                        </Box>
                        <TextBone fontSize={13} width={50} />
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

// ── Graphs ──────────────────────────────────────────────────────────────────

/** Mirrors the insights page (app/gustavo/trips/[slug]/graphs/page.tsx). */
export function GraphsSkeleton() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 450, paddingX: 2, paddingY: 2 }}>
            <TitleRowSkeleton width={90} controls={[30]} />
            {/* Person picker: avatar + name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 36 }}>
                <Circle size={36} />
                <TextBone fontSize={14} width={110} />
            </Box>
            <ChromeBox height={33} />
            {/* Chart card: big number, summary line, stacked bar, legend */}
            <Box sx={{ ...cardSx, padding: 1.5 }}>
                <TextBone fontSize={28} lineHeight={1.1} width={120} />
                <TextBone fontSize={12} width="70%" sx={{ marginTop: 0.25, marginBottom: 1.25 }} />
                <Bone height={22} />
                {[0, 1, 2, 3].map((i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingY: 0.85, borderBottom: i < 3 ? ROW_DIVIDER : 'none', marginTop: i === 0 ? 0.75 : 0 }}>
                        <TextBone fontSize={13} width="36%" />
                        <Bone height={8} sx={{ flex: 1 }} />
                        <TextBone fontSize={13} width={54} />
                    </Box>
                ))}
            </Box>
            {/* Expense list: label, search + sort, rows in bands */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
                <TextBone fontSize={11} width={90} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <ChromeBox height={34} sx={{ flex: 1 }} />
                    <ChromeBox width={88} height={34} />
                </Box>
                {/* Day cards, the Expenses page's format — 12px below the
                    controls, 12px apart */}
                {[3, 2].map((rows, g) => (
                    <Box key={g} sx={{ ...cardSx, overflow: 'hidden', marginTop: 0.5 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingX: 2,
                                paddingY: 1,
                                backgroundColor: '#d4ddb6', // DateGroupHeader
                                borderBottom: `1px solid ${colors.primaryBlack}`,
                            }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 16 }} />
                                <Box>
                                    <TextBone fontSize={13} lineHeight={1.3} width={124} />
                                    <TextBone fontSize={11} lineHeight={1.3} width={112} />
                                </Box>
                            </Box>
                            <TextBone fontSize={13} width={46} />
                        </Box>
                        {Array.from({ length: rows }, (_, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, paddingX: 1.5, paddingY: 1, borderBottom: i < rows - 1 ? ROW_DIVIDER : 'none' }}>
                                <Circle size={28} />
                                <Box sx={{ flex: 1 }}>
                                    <TextBone fontSize={14} lineHeight={1.3} width="55%" />
                                    <TextBone fontSize={11.5} lineHeight={1.3} width="40%" />
                                </Box>
                                <TextBone fontSize={14} width={52} />
                            </Box>
                        ))}
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

// ── Activity ────────────────────────────────────────────────────────────────

/** Mirrors the activity timeline (app/gustavo/trips/[slug]/activity). */
export function ActivitySkeleton() {
    return (
        <Box sx={{ width: '100%', maxWidth: 450 }}>
            {/* Title row: "Activity" + two 30px icon buttons */}
            <Box sx={{ paddingX: 2, paddingTop: 2, paddingBottom: 1 }}>
                <TitleRowSkeleton width={70} controls={[]} chrome={2} />
            </Box>
            <Box sx={{ paddingX: 2, paddingBottom: 3 }}>
                {[3, 2].map((cards, g) => (
                    <Box key={g} sx={{ marginBottom: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, marginTop: 1 }}>
                            <Box sx={{ width: 14 }} />
                            <TextBone fontSize={12} lineHeight={1.2} width={96} />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 1 }}>
                            {Array.from({ length: cards }, (_, i) => (
                                <Box key={i} sx={{ ...cardSx, display: 'flex', gap: 1.25, padding: 1.5 }}>
                                    <Circle size={28} />
                                    <Box sx={{ flex: 1 }}>
                                        <TextBone fontSize={13} width="80%" />
                                        <TextBone fontSize={11} width="40%" sx={{ marginTop: 0.25 }} />
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

// ── Links / Details ─────────────────────────────────────────────────────────

/** Mirrors the links list (components/links/links.tsx). */
export function LinksSkeleton() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 450, paddingX: 2, paddingY: 2 }}>
            <TitleRowSkeleton width={50} controls={[]} />
            <TextBone fontSize={11} width={120} sx={{ marginTop: 0.5 }} />
            {[0, 1, 2, 3].map((i) => (
                <Box key={i} sx={{ ...cardSx, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingX: 2, paddingY: 1.5 }}>
                    <TextBone fontSize={14} width="55%" />
                    <Bone width={20} height={20} />
                </Box>
            ))}
        </Box>
    )
}

/** Mirrors trip details (app/gustavo/trips/[slug]/details/page.tsx) —
 *  its Edit / Delete live in the bottom action bar, not the page. */
export function TripDetailsSkeleton() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 450, paddingX: 4, paddingY: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 3, width: '100%' }}>
                <TextBone fontSize={24} width="60%" />
                <TextBone fontSize={13} width="45%" sx={{ marginBottom: 1.5 }} />
                <Box sx={{ display: 'flex', marginBottom: 2 }}>
                    {[0, 1, 2, 3].map((i) => (
                        <Box key={i} sx={{ marginLeft: i === 0 ? 0 : '-4px' }}>
                            <Circle size={32} />
                        </Box>
                    ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 3 }}>
                    {[0, 1].map((i) => (
                        <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <TextBone fontSize={16} width={64} />
                            <TextBone fontSize={13} width={48} />
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    )
}

// ── Chooser ─────────────────────────────────────────────────────────────────

/**
 * The skeleton for whichever trip page `pathname` is — used by the trip
 * layout's loading gate, which otherwise can't know which tool is loading.
 */
export function TripPageSkeleton({ pathname }: { pathname: string }) {
    const sub = pathname.replace(/^\/gustavo\/trips\/[^/]+\/?/, '')
    if (/^expenses\/(new|[^/]+\/edit)$/.test(sub) || sub === 'edit') {
        return <FormSkeleton />
    }
    if (/^expenses\/[^/]+$/.test(sub)) return <ExpenseDetailSkeleton />
    if (/^debts\/.+/.test(sub)) return <DebtPairSkeleton />
    if (sub.startsWith('debts')) return <DebtsSkeleton />
    if (sub.startsWith('graphs')) return <GraphsSkeleton />
    if (sub.startsWith('activity')) return <ActivitySkeleton />
    if (sub.startsWith('links')) return <LinksSkeleton />
    if (sub.startsWith('details')) return <TripDetailsSkeleton />
    return <ExpensesPageSkeleton />
}


/**
 * Skeleton for any route under /gustavo/trips, chosen from the URL. Every
 * trips-area loading.tsx renders this: a folder's loading boundary also
 * covers its nested routes (trips/loading.tsx shows while entering a trip or
 * the map; expenses/loading.tsx while opening the new-expense form), so each
 * one has to pick the right placeholder rather than assume its own page.
 */
export function TripsRouteSkeleton() {
    const pathname = usePathname()
    if (pathname === '/gustavo/trips') return <TripsListSkeleton />
    if (pathname === '/gustavo/trips/map') return <TripsMapSkeleton />
    if (pathname === '/gustavo/trips/new') {
        return <FormSkeleton fields={['field', 'field', 'field', 'chips', 'field', 'notes']} />
    }
    return <TripPageSkeleton pathname={pathname} />
}
