'use client'

import { Box } from '@mui/material'
import { IconArrowRight, IconChevronDown, IconLock, IconMathSymbols } from '@tabler/icons-react'

import { colors, toneColors } from '@/lib/colors'
import { PageInfoNote, PageInfoSection } from 'components/page-info'

const NEG = toneColors.negative
const POS = toneColors.positive
const INK = colors.primaryBlack

/** Inline pill that looks like the control it describes. */
const Chip = ({ children, bg = colors.primaryYellow }: { children: React.ReactNode; bg?: string }) => (
    <Box
        component="span"
        sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            height: 24,
            paddingX: 0.75,
            border: `1px solid ${INK}`,
            borderRadius: '4px',
            boxShadow: `1.5px 1.5px 0px ${INK}`,
            backgroundColor: bg,
            fontSize: 11.5,
            fontWeight: 800,
            color: INK,
            whiteSpace: 'nowrap',
        }}>
        {children}
    </Box>
)

/** A tiny people-and-arrows diagram for one settle plan. */
function PlanMini({ arrows, label }: { arrows: [number, number, number, number][]; label: string }) {
    const dots: [number, number, string][] = [
        [20, 15, '#a7bed3'],
        [100, 15, '#f0e0c0'],
        [20, 58, '#d9a3a0'],
        [100, 58, '#b8b88a'],
    ]
    const id = `mini-${label.replace(/\W/g, '')}`
    return (
        <Box sx={{ flex: 1, border: `1px solid ${INK}`, borderRadius: '4px', padding: 0.75, textAlign: 'center', backgroundColor: colors.primaryWhite }}>
            <svg viewBox="0 0 120 72" width="100%" role="img" aria-label={`${label}: ${arrows.length} payments`}>
                <defs>
                    <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0 0L10 5L0 10z" fill={INK} />
                    </marker>
                </defs>
                {arrows.map(([x1, y1, x2, y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={1.5} markerEnd={`url(#${id})`} />
                ))}
                {dots.map(([x, y, c]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r={10} fill={c} stroke={INK} />
                ))}
            </svg>
            <Box sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{label}</Box>
            <Box sx={{ fontSize: 11, color: colors.primaryBrown }}>{arrows.length} payments</Box>
        </Box>
    )
}

/**
 * The debts page's ⓘ body: pictures first, a line of words each. Mirrors
 * the real controls (key, bars, hatching, buttons) so they're recognisable.
 */
export function DebtsHelp() {
    return (
        <>
            <PageInfoSection title="Reading the chart">
                <svg viewBox="0 0 300 124" width="100%" role="img" aria-label="Example chart" style={{ display: 'block', marginTop: 6, fontFamily: 'inherit' }}>
                    <defs>
                        <pattern id="help-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <rect width="3" height="6" fill={`${POS}66`} />
                        </pattern>
                    </defs>
                    <line x1="200" y1="14" x2="200" y2="112" stroke={INK} strokeWidth={1.5} />
                    <text x="194" y="10" textAnchor="end" fontSize="9.5" fontWeight="800" fill={NEG}>← YOU OWE</text>
                    <text x="206" y="10" fontSize="9.5" fontWeight="800" fill={POS}>OWED →</text>
                    <rect x="120" y="20" width="80" height="14" fill={`${NEG}38`} stroke={INK} />
                    <text x="0" y="31" fontSize="11" fontWeight="700" fill={INK}>You owe Marco</text>
                    <line x1="120" y1="34" x2="120" y2="44" stroke={`${INK}80`} />
                    <rect x="120" y="44" width="30" height="14" fill={`${POS}38`} stroke={INK} />
                    <text x="0" y="55" fontSize="11" fontWeight="700" fill={INK}>Priya owes you</text>
                    <line x1="150" y1="58" x2="150" y2="68" stroke={`${INK}80`} />
                    <rect x="150" y="68" width="30" height="14" fill="url(#help-hatch)" stroke={POS} />
                    <text x="0" y="79" fontSize="11" fontWeight="700" fill={colors.primaryBrown}>Paid (hatched)</text>
                    <line x1="180" y1="82" x2="180" y2="92" stroke={`${INK}80`} />
                    <rect x="180" y="92" width="20" height="16" fill={colors.primaryYellow} stroke={INK} />
                    <text x="0" y="104" fontSize="11" fontWeight="800" fill={INK}>What&apos;s left to pay</text>
                    <text x="300" y="122" textAnchor="end" fontSize="10" fill={colors.primaryBrown}>each bar starts where the last one ends</text>
                </svg>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, marginTop: 0.75 }}>
                    <IconChevronDown size={15} stroke={2.2} color={colors.primaryBrown} />
                    Tap a row for the expenses behind it.
                </Box>
            </PageInfoSection>

            <PageInfoSection title="Two ways to settle">
                <Box sx={{ display: 'flex', gap: 1, marginTop: 0.75 }}>
                    <PlanMini
                        label="Fewest payments"
                        arrows={[
                            [30, 15, 88, 15],
                            [30, 58, 88, 58],
                            [27, 50, 92, 22],
                        ]}
                    />
                    <PlanMini
                        label="Pay who you owe"
                        arrows={[
                            [30, 15, 88, 15],
                            [20, 26, 20, 46],
                            [30, 58, 88, 58],
                            [100, 48, 100, 26],
                            [27, 50, 92, 22],
                        ]}
                    />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, marginTop: 1 }}>
                    <IconLock size={15} stroke={2} color={INK} style={{ flexShrink: 0 }} />
                    The first payment locks the plan. Undo them all to switch.
                </Box>
            </PageInfoSection>

            <PageInfoSection title="How it adds up">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, marginTop: 0.75 }}>
                    {/* The chart's round maths button, as it looks there */}
                    <Box
                        component="span"
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            flexShrink: 0,
                            border: `1px solid ${INK}`,
                            borderRadius: '50%',
                            boxShadow: `1.5px 1.5px 0px ${INK}`,
                            backgroundColor: colors.primaryYellow,
                            color: INK,
                        }}>
                        <IconMathSymbols size={15} stroke={2} />
                    </Box>
                    on the chart shows how the plan is worked out:
                </Box>
                <Box component="ol" sx={{ margin: 0, marginTop: 0.5, paddingLeft: 2.5 }}>
                    <li>Everyone&apos;s balance, from their debts</li>
                    <li>Step by step: the biggest payer pays the biggest receiver</li>
                    <li>The payments that result</li>
                </Box>
            </PageInfoSection>

            <PageInfoSection title="Settling">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 0.75, flexWrap: 'wrap' }}>
                    <Chip>Settle</Chip>
                    <IconArrowRight size={15} stroke={2} color={INK} />
                    <Box
                        component="span"
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            height: 26,
                            paddingX: 0.75,
                            border: `1px solid ${INK}`,
                            borderLeft: `4px solid ${POS}`,
                            borderRadius: '4px',
                            backgroundColor: colors.primaryWhite,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: INK,
                        }}>
                        Settled
                        <Chip>Undo</Chip>
                    </Box>
                </Box>
                <Box sx={{ marginTop: 0.75 }}>Only the payer, the receiver or a trip admin can settle.</Box>
            </PageInfoSection>

            <PageInfoNote>Tap the avatar at the top to see anyone&apos;s debts.</PageInfoNote>
        </>
    )
}
