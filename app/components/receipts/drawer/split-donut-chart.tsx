'use client'

import { Box } from '@mui/material'
import { colors } from '@/lib/colors'

interface Segment {
    label: string
    value: number       // share amount
    color: string
    isCovered: boolean
    isPayer: boolean
}

interface SplitDonutChartProps {
    segments: Segment[]
    size?: number
}

/** Neo-brutalist donut chart — hard segments, no gradients, hatched pattern for covered. */
export const SplitDonutChart = ({ segments, size = 120 }: SplitDonutChartProps) => {
    const total = segments.reduce((sum, s) => sum + s.value, 0)
    if (total === 0) return null

    const cx = size / 2
    const cy = size / 2
    const outerR = size / 2 - 2 // leave space for border
    const innerR = outerR * 0.55 // donut hole
    const borderWidth = 1.5

    // Build arc path segments
    let startAngle = -90 // start at top
    const paths: { d: string; color: string; isCovered: boolean; isPayer: boolean; id: string }[] = []

    for (const seg of segments) {
        const fraction = seg.value / total
        const sweepAngle = fraction * 360

        // Skip tiny segments
        if (sweepAngle < 0.5) {
            startAngle += sweepAngle
            continue
        }

        const endAngle = startAngle + sweepAngle
        const largeArc = sweepAngle > 180 ? 1 : 0

        const toRad = (deg: number) => (deg * Math.PI) / 180
        const x1Outer = cx + outerR * Math.cos(toRad(startAngle))
        const y1Outer = cy + outerR * Math.sin(toRad(startAngle))
        const x2Outer = cx + outerR * Math.cos(toRad(endAngle))
        const y2Outer = cy + outerR * Math.sin(toRad(endAngle))
        const x1Inner = cx + innerR * Math.cos(toRad(endAngle))
        const y1Inner = cy + innerR * Math.sin(toRad(endAngle))
        const x2Inner = cx + innerR * Math.cos(toRad(startAngle))
        const y2Inner = cy + innerR * Math.sin(toRad(startAngle))

        const d = [
            `M ${x1Outer} ${y1Outer}`,
            `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
            `L ${x1Inner} ${y1Inner}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
            'Z',
        ].join(' ')

        paths.push({
            d,
            color: seg.color,
            isCovered: seg.isCovered,
            isPayer: seg.isPayer,
            id: seg.label,
        })
        startAngle = endAngle
    }

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    {/* Hatched pattern for covered participants */}
                    <pattern
                        id="covered-hatch"
                        width="6"
                        height="6"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)">
                        <line
                            x1="0" y1="0" x2="0" y2="6"
                            stroke={colors.primaryBlack}
                            strokeWidth="1.5"
                            strokeOpacity="0.3"
                        />
                    </pattern>
                </defs>

                {/* Segments */}
                {paths.map((p) => (
                    <g key={p.id}>
                        <path d={p.d} fill={p.color} />
                        {p.isCovered && (
                            <path d={p.d} fill="url(#covered-hatch)" />
                        )}
                    </g>
                ))}

                {/* Border circles */}
                <circle
                    cx={cx} cy={cy} r={outerR}
                    fill="none"
                    stroke={colors.primaryBlack}
                    strokeWidth={borderWidth}
                />
                <circle
                    cx={cx} cy={cy} r={innerR}
                    fill="none"
                    stroke={colors.primaryBlack}
                    strokeWidth={borderWidth}
                />

                {/* Segment divider lines */}
                {(() => {
                    let angle = -90
                    return segments.map((seg) => {
                        const fraction = seg.value / total
                        const sweepAngle = fraction * 360
                        if (sweepAngle < 0.5) {
                            angle += sweepAngle
                            return null
                        }
                        const toRad = (deg: number) => (deg * Math.PI) / 180
                        const x1 = cx + innerR * Math.cos(toRad(angle))
                        const y1 = cy + innerR * Math.sin(toRad(angle))
                        const x2 = cx + outerR * Math.cos(toRad(angle))
                        const y2 = cy + outerR * Math.sin(toRad(angle))
                        angle += sweepAngle
                        return (
                            <line
                                key={`line-${seg.label}`}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={colors.primaryBlack}
                                strokeWidth={borderWidth}
                            />
                        )
                    })
                })()}
            </svg>
        </Box>
    )
}
