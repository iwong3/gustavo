'use client'

import { Box } from '@mui/material'

import { ChromeBox, TextBone } from 'components/skeleton/bones'

/** A preset field shape, or a labelled block of a given height (grids, lists). */
type FieldKind = 'date' | 'field' | 'chips' | 'notes' | { block: number }

/** Label line: labelSx is 13px (line box 19.5) + 4px margin. */
function LabelSkeleton({ width = 90 }: { width?: number }) {
    return <TextBone fontSize={13} width={width} sx={{ marginBottom: 0.5 }} />
}

function FieldSkeleton({ kind }: { kind: FieldKind }) {
    if (typeof kind === 'object') {
        return (
            <Box>
                <LabelSkeleton />
                <ChromeBox height={kind.block} />
            </Box>
        )
    }
    switch (kind) {
        // FormDateField: label row with a 28px calendar button, then the
        // 7-day strip (~47px)
        case 'date':
            return (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 28, marginBottom: 1 }}>
                        <TextBone fontSize={13} width={110} />
                        <ChromeBox width={28} height={28} />
                    </Box>
                    <ChromeBox height={47} />
                </Box>
            )
        // A wrapping row of 28px chips
        case 'chips':
            return (
                <Box>
                    <LabelSkeleton width={70} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {[64, 80, 56, 72].map((w, i) => (
                            <ChromeBox key={i} width={w} height={28} />
                        ))}
                    </Box>
                </Box>
            )
        case 'notes':
            return (
                <Box>
                    <LabelSkeleton width={50} />
                    <ChromeBox height={80} />
                </Box>
            )
        default:
            // Standard size="small" TextField / Select: 40px
            return (
                <Box>
                    <LabelSkeleton />
                    <ChromeBox height={40} />
                </Box>
            )
    }
}

/**
 * Mirrors FormPage (components/form-page.tsx): the h6 title row
 * (16px 16px 0 padding, 32px line) and the 16px-padded, 16px-gap field
 * column. `fields` lists the form's fields top to bottom.
 */
export function FormSkeleton({
    fields = ['date', 'field', 'field', 'field', 'field', 'notes'],
}: {
    fields?: FieldKind[]
}) {
    return (
        <Box sx={{ width: '100%', maxWidth: 450 }}>
            <Box sx={{ padding: '16px 16px 0' }}>
                <TextBone fontSize={20} lineHeight={1.6} width={150} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2 }}>
                {fields.map((kind, i) => (
                    <FieldSkeleton key={i} kind={kind} />
                ))}
            </Box>
        </Box>
    )
}
