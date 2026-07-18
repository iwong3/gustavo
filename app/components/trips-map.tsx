'use client'

/**
 * TripsMap — the "Your Trip Map" world map.
 *
 * Presentational and gallery-importable: trip data (cities + summary) comes in
 * via props. The one thing it loads itself is the static country-outline file
 * (public domain, /geo/countries.geojson) — a rendering resource, not domain
 * data — cached at module scope so it's fetched once per session and shared by
 * the page and any gallery specimen.
 *
 * One dot per city (deduped across trips, from lib/trip-map). No route lines: we
 * don't store flights (order-of-visit arcs are a later, timeline-driven add).
 * Neo-brutalist / passport look: parchment sea, sage land with hard outlines,
 * signature yellow dots.
 *
 * Layout: the map fills its container (the page hands it the full height), so on
 * a phone it's a tall canvas, not a thin strip. It opens framed to the bounding
 * box of your cities (fit-to-cities) — falling back to the whole world when
 * there are none — and you can pinch/wheel to zoom, drag to pan, double-tap or
 * the reset control to recenter. The base projection is the whole world, so you
 * can always zoom back out to the globe. Sized in real pixels so a drag tracks
 * the finger 1:1; dots/strokes are divided by the zoom scale to keep a constant
 * on-screen weight.
 */
import { Box, Typography } from '@mui/material'
import { NaturalEarth, Graticule } from '@visx/geo'
import type { GeoPermissibleObjects } from '@visx/geo'
import { Zoom, applyMatrixToPoint } from '@visx/zoom'
import type { PinchDelta, TransformMatrix } from '@visx/zoom'
import { IconChevronRight, IconPlaneDeparture, IconWorld, IconX, IconZoomReset } from '@tabler/icons-react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { colors, hardShadow } from '@/lib/colors'
import { getCountry } from '@/lib/countries'
import type { TripMapCity, TripMapSummary } from '@/lib/trip-map'
import { SlidingToggle } from 'components/sliding-toggle'
import { FormattedMoney } from 'utils/currency'

// naturalEarth1's world is ~1.94:1; scale ≈ width / 6.4 fits it to the box width.
// A taller box just shows more sea (the card background) above and below.
const projectionScaleFor = (w: number) => w / 6.4
const MAX_ZOOM = 8 // manual pinch/wheel ceiling
const INITIAL_MAX_ZOOM = 5 // don't over-zoom the opening fit on a tight cluster
const FIT_PAD = 0.72 // cities fill ~72% of the frame, leaving breathing room
const LAND = '#e8edca' // sage — same family as the boarding-pass "complete" strip
const SEA = colors.secondaryYellow
const GLOBE_ICON = colors.primaryBlue // bare globe glyph, echoes the header button

// Measure before paint on the client (avoids a first-open height jump); plain
// effect on the server so SSR doesn't warn.
const useIsoLayout = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Zoom gestures track the input 1:1. @visx/zoom's defaults apply a fixed
// ×1.1/×0.9 per EVENT regardless of movement — and both pinch (every touchmove)
// and trackpad scroll (dozens of wheel events per swipe) fire streams of
// events, so a small gesture compounds into a huge leap (1.1^30 ≈ 17×).
//
// Pinch: zoom by the ratio the finger distance changed SINCE THE LAST EVENT.
// offset[0] is @use-gesture's cumulative pinch scale and delta[0] is its
// per-event change — so the previous event's value is (offset − delta), and
// the per-event ratio is offset/(offset − delta). NOT offset/lastOffset:
// lastOffset freezes at gesture START (actions.js: set once in start()), so
// that ratio is cumulative and re-applying it every touchmove compounds
// exponentially — one slow finger-spread slams to max zoom. Clamped as a
// safety net against a zero/garbage first delta.
const pinchDelta: PinchDelta = ({ offset: [s], delta: [ds] }) => {
    const prev = s - ds
    const ratio = Math.min(1.5, Math.max(0.67, prev > 0 && s > 0 ? s / prev : 1))
    return { scaleX: ratio, scaleY: ratio }
}

// Wheel: d3-zoom's formula — scale ∝ 2^(-deltaY·k), with k per deltaMode
// (pixels/lines/pages). A trackpad's tiny deltas become tiny zoom steps; a
// mouse notch (±100px) lands near the old ×1.15 feel. Clamped per event so a
// jumpy high-resolution wheel can't leap.
const wheelDelta = (event: WheelEvent | React.WheelEvent) => {
    const k = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002
    const ratio = Math.min(1.25, Math.max(0.8, Math.pow(2, -event.deltaY * k)))
    return { scaleX: ratio, scaleY: ratio }
}

type WorldGeo = { type: 'FeatureCollection'; features: GeoPermissibleObjects[] }
type Projection = (coords: [number, number]) => [number, number] | null

// Fetched once per session, shared across mounts (page + gallery). Avoids a
// react-query dependency so the component renders anywhere, incl. the gallery.
let geoPromise: Promise<WorldGeo> | null = null
function loadWorldGeo(): Promise<WorldGeo> {
    if (!geoPromise) {
        geoPromise = fetch('/geo/countries.geojson').then((r) => {
            if (!r.ok) throw new Error(`Failed to load map data: ${r.status}`)
            return r.json()
        })
    }
    return geoPromise
}

/** Opening transform that frames the cities' bounding box within the box. Undefined
 *  (→ Zoom's identity, i.e. the whole world) when there are no plottable cities. */
function computeInitialFit(
    cities: TripMapCity[],
    projection: Projection,
    W: number,
    H: number
): TransformMatrix | undefined {
    const pts: [number, number][] = []
    for (const c of cities) {
        const p = projection([c.lng, c.lat])
        if (p) pts.push(p)
    }
    if (pts.length === 0) return undefined

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of pts) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
    }
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const bboxW = Math.max(maxX - minX, 1)
    const bboxH = Math.max(maxY - minY, 1)

    // Fit the bbox (single point → tiny bbox → capped) into the padded frame.
    let scale = Math.min((W * FIT_PAD) / bboxW, (H * FIT_PAD) / bboxH)
    scale = Math.max(1, Math.min(scale, INITIAL_MAX_ZOOM))

    // Center the bbox, then clamp so the frame still covers the viewport (keeps
    // the constrain() invariant: no land dragged off past an edge).
    let tx = W / 2 - cx * scale
    let ty = H / 2 - cy * scale
    tx = Math.min(0, Math.max(W - W * scale, tx))
    ty = Math.min(0, Math.max(H - H * scale, ty))

    return { scaleX: scale, scaleY: scale, translateX: tx, translateY: ty, skewX: 0, skewY: 0 }
}

const cityTitle = (c: TripMapCity) =>
    c.countryCode ? `${c.city} · ${c.countryCode}` : c.city

/** Compact trip date for a card row, e.g. "Nov '25". */
const monthYear = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso + 'T00:00:00')
    return `${d.toLocaleString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`
}

function StatTile({ value, label }: { value: number; label: string }) {
    return (
        <Box
            sx={{
                flex: 1,
                textAlign: 'center',
                paddingY: 1,
                borderRadius: '6px',
                backgroundColor: colors.primaryWhite,
                ...hardShadow,
            }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: colors.primaryBlack }}>
                {value}
            </Typography>
            <Typography
                sx={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    opacity: 0.55,
                    marginTop: '2px',
                }}>
                {label}
            </Typography>
        </Box>
    )
}

/** The zoomable/pannable SVG map, sized to the measured card (real pixels). */
function MapCanvas({
    geo,
    cities,
    width,
    height,
    selectedCity,
    onSelectCity,
}: {
    geo: WorldGeo
    cities: TripMapCity[]
    width: number
    height: number
    selectedCity: TripMapCity | null
    onSelectCity: (city: TripMapCity | null) => void
}) {
    const scale = projectionScaleFor(width)
    const selectedKey = selectedCity?.key ?? null

    // Keep the frame covering the viewport — no dragging the map off past an edge.
    const constrain = useCallback(
        (transform: TransformMatrix, prev: TransformMatrix) => {
            const min = applyMatrixToPoint(transform, { x: 0, y: 0 })
            const max = applyMatrixToPoint(transform, { x: width, y: height })
            if (max.x < width || max.y < height) return prev
            if (min.x > 0 || min.y > 0) return prev
            return transform
        },
        [width, height]
    )

    // Remount (→ re-fit) only when the frame resizes or dots first appear —
    // NOT when the dot set merely changes (e.g. toggling Cities↔Places), so the
    // current zoom/pan is preserved across a toggle.
    const fitKey = `${Math.round(width / 10)}x${Math.round(height / 10)}x${cities.length > 0 ? 1 : 0}`

    return (
        <NaturalEarth data={geo.features} scale={scale} translate={[width / 2, height / 2]}>
            {({ path, features, projection }) => {
                const initial = computeInitialFit(cities, projection as Projection, width, height)
                return (
                    <Zoom<SVGSVGElement>
                        key={fitKey}
                        width={width}
                        height={height}
                        scaleXMin={1}
                        scaleXMax={MAX_ZOOM}
                        scaleYMin={1}
                        scaleYMax={MAX_ZOOM}
                        pinchDelta={pinchDelta}
                        wheelDelta={wheelDelta}
                        constrain={constrain}
                        initialTransformMatrix={initial}>
                        {(zoom) => {
                            const s = zoom.transformMatrix.scaleX
                            return (
                                <>
                                    <svg
                                        ref={zoom.containerRef}
                                        width={width}
                                        height={height}
                                        style={{
                                            display: 'block',
                                            touchAction: 'none', // own all gestures inside the map; page scrolls elsewhere
                                            cursor: zoom.isDragging ? 'grabbing' : 'grab',
                                        }}
                                        onDoubleClick={() => zoom.reset()}>
                                        <g transform={zoom.toString()}>
                                            <Graticule
                                                graticule={(lines) => path(lines) || ''}
                                                stroke={colors.primaryBlack}
                                                strokeWidth={0.4 / s}
                                                strokeOpacity={0.08}
                                                fill="none"
                                            />
                                            {features.map((f, i) => (
                                                <path
                                                    key={i}
                                                    d={f.path || ''}
                                                    fill={LAND}
                                                    stroke={colors.primaryBlack}
                                                    strokeWidth={0.5 / s}
                                                    strokeOpacity={0.85}
                                                />
                                            ))}
                                            {cities.map((c) => {
                                                const xy = projection([c.lng, c.lat])
                                                if (!xy) return null
                                                const [x, y] = xy
                                                const r = 4.4 / s
                                                const isSel = c.key === selectedKey
                                                return (
                                                    <g key={c.key} onClick={() => onSelectCity(c)} style={{ cursor: 'pointer' }}>
                                                        {/* generous invisible hit target for easy tapping */}
                                                        <circle cx={x} cy={y} r={13 / s} fill="transparent" />
                                                        {isSel && (
                                                            <circle cx={x} cy={y} r={(4.4 + 3.5) / s} fill="none" stroke={colors.primaryBlack} strokeWidth={1.6 / s} />
                                                        )}
                                                        {/* hard shadow, then the dot — constant size on screen */}
                                                        <circle cx={x + 1.3 / s} cy={y + 1.3 / s} r={r} fill={colors.primaryBlack} opacity={0.9} />
                                                        <circle cx={x} cy={y} r={r} fill={colors.primaryYellow} stroke={colors.primaryBlack} strokeWidth={1.3 / s}>
                                                            <title>{cityTitle(c)}</title>
                                                        </circle>
                                                        {/* label — white halo (paint-order) keeps it legible over land */}
                                                        <text
                                                            x={x + r + 4 / s}
                                                            y={y}
                                                            dominantBaseline="central"
                                                            fontSize={11 / s}
                                                            fontWeight={700}
                                                            paintOrder="stroke"
                                                            stroke={colors.primaryWhite}
                                                            strokeWidth={3 / s}
                                                            strokeLinejoin="round"
                                                            fill={colors.primaryBlack}
                                                            style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                                            {c.city}
                                                        </text>
                                                    </g>
                                                )
                                            })}
                                        </g>
                                    </svg>

                                    <MorphControl
                                        expanded={!!selectedCity}
                                        city={selectedCity}
                                        zoomedIn={s > 1.05}
                                        maxCardH={height * 0.6}
                                        onReset={() => zoom.reset()}
                                        onClose={() => onSelectCity(null)}
                                    />
                                </>
                            )
                        }}
                    </Zoom>
                )
            }}
        </NaturalEarth>
    )
}

const controlBtnSx = {
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'flexShrink': 0,
    'width': 28,
    'height': 28,
    'borderRadius': '6px',
    'cursor': 'pointer',
    'color': colors.primaryBlack,
    'backgroundColor': colors.primaryWhite,
    ...hardShadow,
    '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
    'transition': 'transform 0.1s, box-shadow 0.1s',
} as const

/** The card's inner content (header + trip rows). Rendered inside MorphControl;
 *  measured so the morph can animate to an exact height. */
function CityCardBody({ city, onClose }: { city: TripMapCity; onClose: () => void }) {
    const country = city.countryCode ? getCountry(city.countryCode) : null
    const spend = FormattedMoney('USD', 0).format(city.totalSpendUsd)
    const meta = [
        country?.name ?? city.countryCode,
        `${spend} spent`,
        `${city.trips.length} ${city.trips.length === 1 ? 'trip' : 'trips'}`,
    ].filter(Boolean).join(' · ')

    return (
        <>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: colors.primaryWhite, display: 'flex', alignItems: 'flex-start', gap: 0.75, padding: '10px 10px 8px 12px' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: 19, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {city.city}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', marginTop: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meta}
                    </Typography>
                </Box>
                <Box onClick={onClose} aria-label="Close" sx={controlBtnSx}>
                    <IconX size={16} stroke={2} />
                </Box>
            </Box>
            <Box sx={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column' }}>
                {city.trips.map((t, i) => (
                    <Box
                        key={t.id}
                        component={Link}
                        href={`/gustavo/trips/${t.slug}/expenses`}
                        onClick={onClose}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 1.25,
                            'padding': '9px 4px',
                            'textDecoration': 'none',
                            'color': colors.primaryBlack,
                            'borderTop': i > 0 ? '1px solid rgba(9, 4, 1, 0.1)' : 'none',
                            'transition': 'background-color 0.12s',
                            '&:active': { backgroundColor: 'rgba(9, 4, 1, 0.05)' },
                        }}>
                        <IconPlaneDeparture size={17} stroke={2} style={{ flexShrink: 0, opacity: 0.65 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {[monthYear(t.startDate), FormattedMoney('USD', 0).format(t.spendUsd)].filter(Boolean).join(' · ')}
                            </Typography>
                        </Box>
                        <IconChevronRight size={16} stroke={2} style={{ flexShrink: 0, opacity: 0.4 }} />
                    </Box>
                ))}
            </Box>
        </>
    )
}

/** One persistent element that IS the reset button when collapsed and the info
 *  card when expanded — so it literally grows out of the button into the card and
 *  shrinks back into it (animating real width/height), instead of two elements
 *  swapping. The reset face stays pinned at the bottom-right (the button's spot)
 *  and cross-fades with the card as the box grows around it. */
function MorphControl({
    expanded,
    city,
    zoomedIn,
    maxCardH,
    onReset,
    onClose,
}: {
    expanded: boolean
    city: TripMapCity | null
    zoomedIn: boolean
    maxCardH: number
    onReset: () => void
    onClose: () => void
}) {
    // Keep the last city so the card's content stays while it collapses.
    const [shownCity, setShownCity] = useState<TripMapCity | null>(city)
    useEffect(() => {
        if (city) setShownCity(city)
    }, [city])

    // Measure the content so the box can grow/shrink to an exact height.
    const contentRef = useRef<HTMLDivElement>(null)
    const [contentH, setContentH] = useState(0)
    useIsoLayout(() => {
        if (contentRef.current) setContentH(contentRef.current.scrollHeight)
    }, [shownCity])

    const targetH = Math.min(Math.max(contentH, 64), maxCardH || 320)
    const visible = expanded || zoomedIn

    return (
        <Box
            sx={{
                'position': 'absolute',
                'right': 8,
                'bottom': 8,
                'zIndex': 4,
                'backgroundColor': colors.primaryWhite,
                'border': `1px solid ${colors.primaryBlack}`,
                'color': colors.primaryBlack,
                'overflowX': 'hidden',
                'overflowY': expanded ? 'auto' : 'hidden',
                'opacity': visible ? 1 : 0,
                'pointerEvents': visible ? 'auto' : 'none',
                'width': expanded ? 'calc(100% - 16px)' : 32,
                'height': expanded ? targetH : 32,
                'borderRadius': expanded ? '12px' : '6px',
                'boxShadow': expanded ? `3px 3px 0 ${colors.primaryBlack}` : `2px 2px 0 ${colors.primaryBlack}`,
                'transition': 'width 220ms ease, height 220ms ease, border-radius 220ms ease, box-shadow 220ms ease, opacity 150ms ease',
                '@media (prefers-reduced-motion: reduce)': { transition: 'opacity 150ms ease' },
            }}>
            {/* Reset-button face — pinned bottom-right (the button's spot), fades out as the card grows. */}
            <Box
                onClick={expanded ? undefined : onReset}
                aria-label="Reset map view"
                sx={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: expanded ? 0 : 1,
                    pointerEvents: expanded ? 'none' : 'auto',
                    transition: 'opacity 120ms ease',
                    cursor: 'pointer',
                    zIndex: 2,
                }}>
                <IconZoomReset size={18} stroke={2} />
            </Box>

            {/* Card face — measured; revealed as the box grows. */}
            <Box
                ref={contentRef}
                sx={{
                    opacity: expanded ? 1 : 0,
                    pointerEvents: expanded ? 'auto' : 'none',
                    transition: 'opacity 150ms ease',
                    lineHeight: 'normal',
                }}>
                {shownCity && <CityCardBody city={shownCity} onClose={onClose} />}
            </Box>
        </Box>
    )
}

export function TripsMap({
    cities,
    places,
    summary,
    isLoading = false,
    isError = false,
}: {
    cities: TripMapCity[]
    places: TripMapCity[]
    summary: TripMapSummary
    isLoading?: boolean
    isError?: boolean
}) {
    const [geo, setGeo] = useState<WorldGeo | null>(null)
    const [geoError, setGeoError] = useState(false)

    const cardRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const [selectedCity, setSelectedCity] = useState<TripMapCity | null>(null)
    const [mode, setMode] = useState<'cities' | 'places'>('cities')

    // The active dot set. Switching views clears the selection — the tapped dot
    // won't exist in the other view.
    const dots = mode === 'cities' ? cities : places
    const changeMode = (m: string) => {
        setSelectedCity(null)
        setMode(m === 'places' ? 'places' : 'cities')
    }

    useEffect(() => {
        let alive = true
        loadWorldGeo()
            .then((g) => alive && setGeo(g))
            .catch(() => alive && setGeoError(true))
        return () => {
            alive = false
        }
    }, [])

    // Measure the card so the SVG renders at real pixels (drag tracks 1:1).
    // Measure synchronously on mount — clientWidth/Height force layout and work
    // even when a ResizeObserver hasn't fired (e.g. a backgrounded tab) — then
    // keep it in sync on resize.
    useEffect(() => {
        const el = cardRef.current
        if (!el) return
        const measure = () => {
            const width = el.clientWidth
            const height = el.clientHeight
            if (width > 0 && height > 0) {
                setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
            }
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const { width, height } = size
    const error = isError || geoError
    const mapFrameLoading = !error && (!geo || width === 0 || height === 0)

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', height: '100%', minHeight: 0 }}>
            {/* Title — the globe glyph echoes the header button you tapped to get here */}
            <Box sx={{ flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* translateY optically centers the glyph against the serif
                        caps — the ink sits ~1px above the icon's box centre. */}
                    <IconWorld
                        size={26}
                        stroke={2}
                        color={GLOBE_ICON}
                        style={{ transform: 'translateY(1px)' }}
                    />
                    <Typography sx={{ fontSize: 26, fontFamily: 'var(--font-serif)', lineHeight: 1.15 }}>
                        Your Trip Map
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', marginTop: 0.5 }}>
                    Every city you&apos;ve been to — pinch to zoom, drag to pan.
                </Typography>
            </Box>

            {/* Map card — fills the remaining height */}
            <Box
                ref={cardRef}
                sx={{
                    position: 'relative',
                    flex: 1,
                    minHeight: 180,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: SEA,
                    ...hardShadow,
                    lineHeight: 0,
                }}>
                {geo && width > 0 && height > 0 && !error && (
                    <MapCanvas
                        geo={geo}
                        cities={dots}
                        width={width}
                        height={height}
                        selectedCity={selectedCity}
                        onSelectCity={setSelectedCity}
                    />
                )}

                {/* Cities / Places view toggle — floating, top-right of the map */}
                {!mapFrameLoading && !error && (cities.length > 0 || places.length > 0) && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 5, width: 150 }}>
                        <SlidingToggle
                            value={mode}
                            options={[
                                { value: 'places', label: 'Places' },
                                { value: 'cities', label: 'Cities' },
                            ]}
                            onChange={changeMode}
                            fontSize={13}
                            borderWidth={1}
                            paddingY={1.15}
                        />
                    </Box>
                )}

                {mapFrameLoading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: 0.5,
                        }}>
                        Loading map…
                    </Box>
                )}

                {error && (
                    <Box sx={{ padding: 4, textAlign: 'center', fontSize: 13, color: 'text.secondary' }}>
                        Couldn&apos;t load the map. Pull down to refresh.
                    </Box>
                )}
            </Box>

            {/* Stat strip */}
            {/* Coarse → fine: trips → countries → cities → places */}
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <StatTile value={summary.tripCount} label="Trips" />
                <StatTile value={summary.countryCount} label="Countries" />
                <StatTile value={summary.cityCount} label="Cities" />
                <StatTile value={summary.placeCount} label="Places" />
            </Box>

            {/* Empty state — map still renders (just no dots) */}
            {!mapFrameLoading && !error && !isLoading && dots.length === 0 && (
                <Typography sx={{ textAlign: 'center', fontSize: 13, color: 'text.secondary', flexShrink: 0 }}>
                    No mapped places yet. Attach a place to an expense and its city
                    will appear here.
                </Typography>
            )}

        </Box>
    )
}
