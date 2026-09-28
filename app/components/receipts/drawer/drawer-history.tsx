'use client'

import { Box, ButtonBase, Typography } from '@mui/material'
import { IconChevronDown, IconHistory } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { cardSx, colors, pressRowSx } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import { ActivityList, buildActivityCards } from 'components/activity/activity-card'
import { AnimatedHeight } from 'components/animated-height'
import { fetchActivity } from 'utils/api'

/**
 * The expense page's edit history — this expense's rows from the Activity
 * feed, for "who changed this?". Collapsed by default; fetches on first open
 * (then cached with the trip, so it refreshes along with it).
 */
export function DrawerHistory({ tripId, expenseId }: { tripId: number; expenseId: number | string }) {
    const [open, setOpen] = useState(false)
    const query = useQuery({
        queryKey: queryKeys.trips.expenseHistory(tripId, expenseId),
        queryFn: () => fetchActivity(tripId, expenseId),
        enabled: open,
    })

    const data = query.data
    const models = useMemo(
        () => (data ? buildActivityCards(data.entries, new Set(data.ignoredFields)) : []),
        [data]
    )

    let body: React.ReactNode = null
    if (open) {
        if (query.isPending) body = <Note>Loading…</Note>
        else if (query.isError) body = <Note>Couldn&apos;t load the history. Check your connection.</Note>
        else if (models.length === 0) body = <Note>No changes recorded.</Note>
        else
            body = (
                <ActivityList
                    bare
                    models={models}
                    fieldLabels={data?.fieldLabels ?? {}}
                    context="expense"
                />
            )
    }

    return (
        <Box sx={{ marginX: 2.5, marginBottom: 2, ...cardSx, overflow: 'hidden' }}>
            <ButtonBase
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                sx={{
                    width: '100%',
                    height: 40,
                    paddingX: 1.5,
                    gap: 1,
                    justifyContent: 'flex-start',
                    ...pressRowSx,
                }}>
                <IconHistory size={16} color={colors.primaryBlack} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'left' }}>
                    History
                </Typography>
                {data && (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {models.length} {models.length === 1 ? 'change' : 'changes'}
                    </Typography>
                )}
                <IconChevronDown
                    size={16}
                    color={colors.primaryBlack}
                    style={{
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 150ms',
                    }}
                />
            </ButtonBase>
            <AnimatedHeight duration={150}>
                {body && (
                    <Box sx={{ borderTop: `1px solid ${colors.primaryBlack}1f` }}>{body}</Box>
                )}
            </AnimatedHeight>
        </Box>
    )
}

const Note = ({ children }: { children: React.ReactNode }) => (
    <Typography sx={{ fontSize: 12, color: 'text.secondary', paddingX: 1.5, paddingY: 1.25 }}>
        {children}
    </Typography>
)
