'use client'

import { Box, Typography } from '@mui/material'
import {
    IconCalendarEvent,
    IconChevronDown,
    IconCurrencyDollar,
} from '@tabler/icons-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { colors } from '@/lib/colors'
import {
    useFilterLocationStore,
    useFilterPaidByStore,
    useFilterSpendTypeStore,
    useFilterSplitBetweenStore,
    type FilterStore,
} from 'components/menu/filter/filter-stores'
import {
    SORT_FIELDS,
    sortSpec,
    useSortStore,
    type SortField,
} from 'components/menu/sort/sort-store'
import {
    expensesForOption,
    selectedOptions,
    type FacetKey,
    type FilterMaps,
} from 'utils/expense-filters'
import { getColorForCategory, getIconFromCategory, InitialsIcon } from 'utils/icons'

import type { Expense, ParticipantSummary } from '@/lib/types'

// ── Density ───────────────────────────────────────────────────────────────────
// Below the polish checklist's 34px tap target, on the same grounds CategoryPicker
// already ships 32px rows: these are full-bleed, so the target stays forgiving
// despite the height. Person rows carry a 20px avatar and so run taller.

const H_PERSON = 36
const H_WORD = 28
const H_HEAD = 28
const H_SORT = 36
const AVATAR = 20
const ROW_FONT = 12.5

const HAIRLINE = `1px solid ${colors.primaryBlack}15`

// ── Facet config ──────────────────────────────────────────────────────────────

type Facet = {
    key: FacetKey
    label: string
    store: typeof useFilterPaidByStore
    /** People get an avatar and a taller row; categories and places get a swatch. */
    kind: 'person' | 'category' | 'place'
}

const FACETS: Facet[] = [
    { key: 'paidBy', label: 'Paid by', store: useFilterPaidByStore, kind: 'person' },
    { key: 'split', label: 'Split between', store: useFilterSplitBetweenStore, kind: 'person' },
    { key: 'spendType', label: 'Category', store: useFilterSpendTypeStore, kind: 'category' },
    { key: 'location', label: 'Location', store: useFilterLocationStore, kind: 'place' },
]

type Props = {
    /** All trip expenses — the panel counts options against these, not the
     *  already-filtered list, so a facet's own options stay live. */
    expenses: Expense[]
    participants: ParticipantSummary[]
    getUsdValue: (exp: Expense) => number
    /** The page keeps the panel mounted for one frame while it plays its exit
     *  animation; this flips the animation from enter to exit. */
    closing?: boolean
}

// Natural height of a facet card, derived from its option count rather than
// measured. Lets the panel decide what to open before it has rendered anything,
// instead of expanding everything and measuring the overflow.
const SECTION_GAP = 12
const cardHeight = (optionCount: number, rowHeight: number) =>
    2 + // card top + bottom border
    H_WORD + // the All row
    1 + // the black rule under it
    optionCount * rowHeight +
    (optionCount - 1) // hairlines between rows
const sectionHeight = (bodyHeight: number) => H_HEAD + 2 + bodyHeight + SECTION_GAP

export function RefinePanel({ expenses, participants, getUsdValue, closing = false }: Props) {
    // Paid by opens so the row anatomy is visible — an all-collapsed menu is
    // four mystery rows and teaches nothing. The rest depends on the room
    // available; see the measuring ref below.
    const [openSections, setOpenSections] = useState<Set<string>>(
        () => new Set(['paidBy'])
    )
    const toggleSection = (key: string) =>
        setOpenSections((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    const paidBy = useFilterPaidByStore((s) => s.filters)
    const split = useFilterSplitBetweenStore((s) => s.filters)
    const spendType = useFilterSpendTypeStore((s) => s.filters)
    const location = useFilterLocationStore((s) => s.filters)

    const maps: FilterMaps = useMemo(
        () => ({ paidBy, split, spendType, location }),
        [paidBy, split, spendType, location]
    )

    const sortField = useSortStore((s) => s.field)
    const sortDir = useSortStore((s) => s.dir)
    const sortIsDefault = useSortStore((s) => s.isDefault)()
    const spec = sortSpec(sortField)

    const participantByName = useMemo(() => {
        const m = new Map<string, ParticipantSummary>()
        for (const p of participants) m.set(p.firstName, p)
        return m
    }, [participants])

    // How tall the panel would be with every section open.
    const expandedHeight = useMemo(() => {
        let h = sectionHeight(H_SORT)
        for (const facet of FACETS) {
            const count = maps[facet.key].size
            if (count === 0) continue
            h += sectionHeight(
                cardHeight(count, facet.kind === 'person' ? H_PERSON : H_WORD)
            )
        }
        return h
    }, [maps])

    // The options arrive from the stores, which the trip layout seeds. Until at
    // least one has landed every facet looks empty, and an empty panel always
    // "fits" — so hold the decision rather than make the wrong one and cache it.
    const optionsReady = FACETS.some((facet) => maps[facet.key].size > 0)

    // Open everything, but only when everything fits — a short trip has room to
    // show its whole filter set at once, a long one doesn't and shouldn't
    // pretend to. Decided once, in a ref callback: that runs after layout but
    // before paint, so the panel arrives already in its final shape rather than
    // expanding a frame later. A layout effect would do the same but trips the
    // repo's set-state-in-effect rule. Changing `expandedHeight` re-creates the
    // callback, which is what re-runs it once the options do land.
    const decided = useRef(false)
    const measureBody = useCallback(
        (el: HTMLDivElement | null) => {
            if (!el || decided.current || !optionsReady) return
            decided.current = true
            // Measured while collapsed, so clientHeight is the room available
            // rather than the room already taken.
            if (expandedHeight <= el.clientHeight) {
                setOpenSections(new Set(FACETS.map((f) => f.key)))
            }
        },
        [expandedHeight, optionsReady]
    )

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                flex: 1,
                // Opaque, matching the page: while closing, the page renders the
                // rows underneath and this panel fades out OVER them — the fade
                // is a crossfade to the rows, not a fade to a blank screen.
                backgroundColor: colors.secondaryYellow,
                // The rows vanish and the panel arrives in their place; closing
                // reverses it, fading back up over the returning rows. Transform +
                // opacity only, so both composite on the GPU. Exit is quicker and
                // eases in (accelerates away) — snappier than the entrance.
                '@keyframes refineIn': {
                    from: { opacity: 0, transform: 'translateY(-8px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                '@keyframes refineOut': {
                    from: { opacity: 1, transform: 'translateY(0)' },
                    to: { opacity: 0, transform: 'translateY(-8px)' },
                },
                animation: closing
                    ? 'refineOut 120ms cubic-bezier(0.4, 0, 1, 1) forwards'
                    : 'refineIn 140ms cubic-bezier(0.2, 0, 0, 1)',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}>
            <Box
                ref={measureBody}
                sx={{ flex: 1, minHeight: 0, paddingX: 2, paddingBottom: 1.5 }}>
                {/* No title row: the ⚙ that opened this closes it, and Reset /
                    Done live in the app's action bar (the page mounts it, taking
                    over the tab bar's slot while this is open).

                    Sort doesn't collapse — it's a single 38px row, so a chevron
                    would cost a tap to save nothing. */}
                <Box sx={{ marginBottom: 1.5 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            height: H_HEAD,
                            paddingX: 0.25,
                        }}>
                        <Typography
                            sx={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: colors.primaryBrown,
                                flexShrink: 0,
                            }}>
                            Sort by
                        </Typography>
                        <Typography
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                fontSize: 12,
                                fontWeight: 600,
                                color: sortIsDefault
                                    ? colors.primaryBrown
                                    : colors.primaryBlack,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                            {spec.label} · {spec.hint[sortDir]}
                        </Typography>
                    </Box>
                    <Box sx={{ paddingTop: '2px' }}>
                        <SortGlyphs />
                    </Box>
                </Box>

                {FACETS.map((facet) => (
                    <FacetSection
                        key={facet.key}
                        facet={facet}
                        maps={maps}
                        expenses={expenses}
                        getUsdValue={getUsdValue}
                        participantByName={participantByName}
                        open={openSections.has(facet.key)}
                        onToggle={() => toggleSection(facet.key)}
                    />
                ))}
            </Box>
        </Box>
    )
}

// ── Section shell ─────────────────────────────────────────────────────────────
// The label row is the collapse toggle. Sections collapse independently rather
// than as an accordion, so Category and Location can be open together.

function Section({
    label,
    summary,
    isSet,
    open,
    onToggle,
    children,
}: {
    label: string
    summary: string
    isSet: boolean
    open: boolean
    onToggle: () => void
    children: React.ReactNode
}) {
    return (
        <Box sx={{ marginBottom: 1.5 }}>
            <Box
                onClick={onToggle}
                role="button"
                aria-expanded={open}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    height: H_HEAD,
                    paddingX: 0.25,
                    cursor: 'pointer',
                    userSelect: 'none',
                }}>
                <Typography
                    sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: colors.primaryBrown,
                    }}>
                    {label}
                </Typography>
                <Typography
                    sx={{
                        flex: 1,
                        textAlign: 'right',
                        fontSize: 12,
                        fontWeight: 600,
                        color: isSet ? colors.primaryBlack : colors.primaryBrown,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                    {summary}
                </Typography>
                <IconChevronDown
                    size={13}
                    stroke={2.5}
                    style={{
                        flexShrink: 0,
                        color: colors.primaryBrown,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 140ms cubic-bezier(0.2, 0, 0, 1)',
                    }}
                />
            </Box>
            <Box
                sx={{
                    display: 'grid',
                    // Animating grid-template-rows 0fr→1fr avoids measuring the
                    // content's height in JS, which a variable-length option list
                    // would otherwise force.
                    gridTemplateRows: open ? '1fr' : '0fr',
                    transition: 'grid-template-rows 140ms cubic-bezier(0.2, 0, 0, 1)',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}>
                <Box sx={{ overflow: 'hidden', minHeight: 0 }}>
                    <Box sx={{ paddingTop: '2px' }}>{children}</Box>
                </Box>
            </Box>
        </Box>
    )
}

// ── Sort ──────────────────────────────────────────────────────────────────────

const SORT_GLYPH: Record<SortField, React.ReactNode> = {
    date: <IconCalendarEvent size={15} />,
    amount: <IconCurrencyDollar size={15} />,
    name: (
        <Box
            component="span"
            sx={{
                fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                lineHeight: 1,
            }}>
            Az
        </Box>
    ),
}

function SortGlyphs() {
    const field = useSortStore((s) => s.field)
    const dir = useSortStore((s) => s.dir)
    const pick = useSortStore((s) => s.pick)

    return (
        <Box sx={{ display: 'flex', gap: 1 }}>
            {SORT_FIELDS.map((f) => {
                const active = f.field === field
                return (
                    <Box
                        key={f.field}
                        onClick={() => pick(f.field)}
                        role="button"
                        aria-pressed={active}
                        aria-label={`Sort by ${f.label}${active ? `, ${f.hint[dir]}` : ''}`}
                        sx={{
                            'flex': 1,
                            'height': H_SORT,
                            'display': 'flex',
                            'alignItems': 'center',
                            'justifyContent': 'center',
                            'gap': 0.625,
                            'border': `1px solid ${colors.primaryBlack}`,
                            'borderRadius': '4px',
                            'cursor': 'pointer',
                            'userSelect': 'none',
                            // Selected lifts off the page; unselected sits flat.
                            'backgroundColor': active
                                ? colors.primaryYellow
                                : colors.primaryWhite,
                            'boxShadow': active
                                ? `2px 2px 0px ${colors.primaryBlack}`
                                : 'none',
                            'opacity': active ? 1 : 0.6,
                            '&:active': {
                                boxShadow: 'none',
                                transform: 'translate(2px, 2px)',
                            },
                            'transition':
                                'background-color 0.1s, box-shadow 0.1s, opacity 0.1s, transform 0.1s',
                        }}>
                        {SORT_GLYPH[f.field]}
                        {/* lineHeight 1, like PageActionButton's label: without
                            it the label inherits 1.5 and sits in a 16.5px box
                            next to a 12px arrow and a 15px icon. Same centres,
                            but the ink rides high in the taller box, so the word
                            reads as lifted off the icon. */}
                        <Typography
                            sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
                            {f.label}
                        </Typography>
                        {active && (
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    // Optical only: the ↑/↓ glyph's ink sits a
                                    // pixel below the centre of its own line box,
                                    // so centring the box leaves the arrow low
                                    // against the icon and label. transform, not
                                    // margin, so it doesn't move the layout.
                                    transform: 'translateY(-1px)',
                                }}>
                                {dir === 'asc' ? '↑' : '↓'}
                            </Typography>
                        )}
                    </Box>
                )
            })}
        </Box>
    )
}

// ── Facet card ────────────────────────────────────────────────────────────────

function FacetSection({
    facet,
    maps,
    expenses,
    getUsdValue,
    participantByName,
    open,
    onToggle,
}: {
    facet: Facet
    maps: FilterMaps
    expenses: Expense[]
    getUsdValue: (exp: Expense) => number
    participantByName: Map<string, ParticipantSummary>
    open: boolean
    onToggle: () => void
}) {
    const filters = facet.store((s: FilterStore) => s.filters)
    const toggle = facet.store((s: FilterStore) => s.toggle)
    const clear = facet.store((s: FilterStore) => s.clear)

    const options = Array.from(filters.keys())
    const chosen = selectedOptions(filters)
    const summary = chosen.length
        ? `${chosen[0]}${chosen.length > 1 ? ` +${chosen.length - 1}` : ''}`
        : 'All'

    if (options.length === 0) return null

    const tall = facet.kind === 'person'

    return (
        <Section
            label={facet.label}
            summary={summary}
            isSet={chosen.length > 0}
            open={open}
            onToggle={onToggle}>
            <Box
                sx={{
                    backgroundColor: colors.primaryWhite,
                    border: `1px solid ${colors.primaryBlack}`,
                    borderRadius: '4px',
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                    overflow: 'hidden',
                }}>
                {/* "All" — the card's top row, mirroring Split-between's
                    "Everyone". Selected when the facet constrains nothing, which
                    is otherwise a state with nothing on screen to show it. */}
                <Box
                    onClick={clear}
                    role="button"
                    aria-pressed={chosen.length === 0}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        height: H_WORD,
                        paddingX: '10px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        fontSize: ROW_FONT,
                        fontWeight: 600,
                        backgroundColor:
                            chosen.length === 0
                                ? colors.primaryYellow
                                : colors.primaryWhite,
                        borderBottom: `1px solid ${colors.primaryBlack}`,
                        transition: 'background-color 0.15s',
                    }}>
                    <Checkbox checked={chosen.length === 0} />
                    <Typography sx={{ fontSize: ROW_FONT, fontWeight: 600 }}>
                        All
                    </Typography>
                </Box>

                {options.map((option, i) => {
                    const selected = filters.get(option) === true
                    const rows = expensesForOption(
                        expenses,
                        maps,
                        facet.key,
                        option
                    )
                    const amount = rows.reduce((t, e) => t + getUsdValue(e), 0)
                    // Nothing to find and not already chosen — dim it so you
                    // can't tap your way into an empty list.
                    const unavailable = rows.length === 0 && !selected

                    return (
                        <Box
                            key={option}
                            onClick={() => toggle(option)}
                            role="button"
                            aria-pressed={selected}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                height: tall ? H_PERSON : H_WORD,
                                paddingX: '10px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                fontSize: ROW_FONT,
                                fontWeight: selected ? 600 : 400,
                                color: unavailable
                                    ? `${colors.primaryBlack}66`
                                    : colors.primaryBlack,
                                backgroundColor: selected
                                    ? colors.primaryYellow
                                    : unavailable
                                      ? `${colors.primaryBlack}08`
                                      : colors.primaryWhite,
                                borderBottom:
                                    i < options.length - 1 ? HAIRLINE : 'none',
                                transition: 'background-color 0.15s',
                            }}>
                            <Checkbox checked={selected} />
                            {/* Locations get no lead. They have no visual
                                identity here — getLocationColor is a hardcoded
                                five-place map with one grey fallback, so off
                                those places every swatch is the same colour and
                                says nothing. An empty box in its place just read
                                as a second checkbox. The name is the identity. */}
                            {facet.kind !== 'place' && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexShrink: 0,
                                        opacity: unavailable ? 0.4 : 1,
                                    }}>
                                    {facet.kind === 'person' ? (
                                        <InitialsIcon
                                            name={option}
                                            initials={participantByName.get(option)?.initials}
                                            iconColor={participantByName.get(option)?.iconColor}
                                            sx={{
                                                width: AVATAR,
                                                height: AVATAR,
                                                fontSize: 8.5,
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '3px',
                                                border: `1px solid ${colors.primaryBlack}`,
                                                backgroundColor: getColorForCategory(option),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                            {getIconFromCategory(option, 10)}
                                        </Box>
                                    )}
                                </Box>
                            )}
                            <Typography
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: ROW_FONT,
                                    fontWeight: selected ? 600 : 400,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                {option}
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily:
                                        'ui-monospace, "Cascadia Mono", Consolas, monospace',
                                    fontSize: 11,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: selected
                                        ? colors.primaryBlack
                                        : colors.primaryBrown,
                                    opacity: unavailable ? 0.5 : 1,
                                }}>
                                ${Math.round(amount).toLocaleString('en-US')}
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily:
                                        'ui-monospace, "Cascadia Mono", Consolas, monospace',
                                    fontSize: 10,
                                    width: 16,
                                    textAlign: 'right',
                                    color: colors.primaryBrown,
                                    opacity: unavailable ? 0.5 : 0.85,
                                }}>
                                {rows.length}
                            </Typography>
                        </Box>
                    )
                })}
            </Box>
        </Section>
    )
}

function Checkbox({ checked }: { checked: boolean }) {
    return (
        <Box
            sx={{
                width: 15,
                height: 15,
                flexShrink: 0,
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '3px',
                backgroundColor: colors.primaryWhite,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 900,
                lineHeight: 1,
            }}>
            {checked ? '✓' : ''}
        </Box>
    )
}
