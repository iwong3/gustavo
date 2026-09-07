'use client'

import { Box, Typography } from '@mui/material'
import {
    IconCalendarEvent,
    IconChevronLeft,
    IconChevronRight,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { colors } from '@/lib/colors'
import { fieldShadow, labelSx } from '@/lib/form-styles'

type Props = {
    /** ISO date (YYYY-MM-DD). '' = nothing picked. */
    value: string
    onChange: (iso: string) => void
    label?: string
    required?: boolean
    /** Extra control in the header, left of the selected-date text (e.g. a
     *  "Use today?" link). */
    headerExtra?: ReactNode
}

const toDay = (iso: string) => dayjs(iso + 'T00:00:00')

/**
 * The standard date input for page-style forms — a week strip for one-tap
 * picks of nearby dates, plus a calendar button that opens the native picker
 * for anything else. The header shows the selected date as text.
 *
 * Sits first in a form's field order (see code-guide.md § Page-style forms).
 */
export function FormDateField({
    value,
    onChange,
    label = 'Date',
    required = false,
    headerExtra,
}: Props) {
    const selectedDay = toDay(value)
    const today = dayjs()

    // First day of the week shown in the strip. Paging moves it without
    // touching the value; picking a date re-anchors to that date's week.
    const [weekAnchor, setWeekAnchor] = useState(() =>
        (selectedDay.isValid() ? selectedDay : today).startOf('week')
    )
    // Follow value changes made outside the strip (e.g. a form seeding a
    // different date after mount) — the "adjust state on prop change" pattern,
    // re-anchoring during render rather than in an effect.
    const [prevValue, setPrevValue] = useState(value)
    if (value !== prevValue) {
        setPrevValue(value)
        if (selectedDay.isValid()) setWeekAnchor(selectedDay.startOf('week'))
    }

    const dateInputRef = useRef<HTMLInputElement>(null)

    const weekDays = Array.from({ length: 7 }, (_, i) =>
        weekAnchor.add(i, 'day')
    )

    // Desktop browsers only open the calendar via showPicker(); on iOS the
    // tap lands on the (invisible, full-size) input itself, which opens the
    // native picker without needing this call.
    const openNativePicker = () => {
        try {
            dateInputRef.current?.showPicker()
        } catch {
            // iOS: focusing the input (which the tap already did) opens it
        }
    }

    // Week paging paddle at either end of the strip
    const weekPaddle = (direction: -1 | 1) => (
        <Box
            onClick={() => setWeekAnchor((a) => a.add(direction * 7, 'day'))}
            role="button"
            aria-label={direction > 0 ? 'Next week' : 'Previous week'}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'justifyContent': 'center',
                'width': 30,
                'flexShrink': 0,
                'cursor': 'pointer',
                'userSelect': 'none',
                [direction > 0 ? 'borderLeft' : 'borderRight']: '1px solid',
                'borderColor': 'divider',
                '&:active': { backgroundColor: 'rgba(0,0,0,0.06)' },
            }}>
            {direction > 0 ? (
                <IconChevronRight size={16} color={colors.primaryBlack} />
            ) : (
                <IconChevronLeft size={16} color={colors.primaryBlack} />
            )}
        </Box>
    )

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 1,
                }}>
                <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                    {label}
                    {required ? ' *' : ''}
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}>
                    {headerExtra}
                    {/* Selected date — plain text */}
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: colors.primaryBlack,
                            lineHeight: 1,
                        }}>
                        {selectedDay.isValid()
                            ? selectedDay.format('ddd, MMM D')
                            : 'Pick a date'}
                    </Typography>
                    {/* Full-calendar button. The real date input sits
                        invisibly on top so the tap hits it directly —
                        iOS opens its native picker from that tap, while
                        desktop needs the explicit showPicker() call. */}
                    <Box
                        sx={{
                            'position': 'relative',
                            'display': 'flex',
                            'alignItems': 'center',
                            'justifyContent': 'center',
                            'width': 28,
                            'height': 28,
                            'borderRadius': '4px',
                            'userSelect': 'none',
                            'backgroundColor': colors.primaryWhite,
                            'border': `1px solid ${colors.primaryBlack}`,
                            'boxShadow': fieldShadow,
                            'transition': 'transform 0.1s, box-shadow 0.1s',
                            '&:active': {
                                boxShadow: 'none',
                                transform: 'translate(2px, 2px)',
                            },
                        }}>
                        <IconCalendarEvent
                            size={16}
                            color={colors.primaryBlack}
                        />
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onClick={openNativePicker}
                            aria-label="Pick a date"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer',
                                border: 0,
                                padding: 0,
                            }}
                        />
                    </Box>
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    backgroundColor: colors.primaryWhite,
                    border: `1px solid ${colors.primaryBlack}`,
                    borderRadius: '4px',
                    boxShadow: fieldShadow,
                    overflow: 'hidden',
                }}>
                {weekPaddle(-1)}
                {weekDays.map((d) => {
                    const isSelected =
                        selectedDay.isValid() && d.isSame(selectedDay, 'day')
                    const isToday = d.isSame(today, 'day')
                    return (
                        <Box
                            key={d.format('YYYY-MM-DD')}
                            onClick={() => onChange(d.format('YYYY-MM-DD'))}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                paddingY: 0.75,
                                cursor: 'pointer',
                                userSelect: 'none',
                                backgroundColor: isSelected
                                    ? colors.primaryYellow
                                    : 'transparent',
                                transition: 'background-color 0.15s',
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 9,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    color: 'text.secondary',
                                    lineHeight: 1,
                                }}>
                                {d.format('dd')}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: colors.primaryBlack,
                                    lineHeight: 1,
                                }}>
                                {d.format('D')}
                            </Typography>
                            {/* Today marker */}
                            <Box
                                sx={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: '50%',
                                    backgroundColor: isToday
                                        ? colors.primaryBrown
                                        : 'transparent',
                                }}
                            />
                        </Box>
                    )
                })}
                {weekPaddle(1)}
            </Box>
        </Box>
    )
}
