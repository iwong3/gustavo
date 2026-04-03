'use client'

import { colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'

interface AlphabetIndexProps {
    /** Set of letters that have at least one item */
    availableLetters: Set<string>
    /** Called when user taps or drags to a letter */
    onSelect: (letter: string) => void
    /** Offset from top for sticky positioning (e.g. to clear a sticky header) */
    topOffset?: number
    /** Which side of the list to render on */
    side?: 'left' | 'right'
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function AlphabetIndex({
    availableLetters,
    onSelect,
    topOffset = 0,
    side = 'right',
}: AlphabetIndexProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const lastLetterRef = useRef<string | null>(null)
    const [activeLetter, setActiveLetter] = useState<string | null>(null)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)

    const visibleLetters = ALPHABET.filter((l) => availableLetters.has(l))

    const getLetterFromY = useCallback(
        (clientY: number): string | null => {
            const el = containerRef.current
            if (!el) return null
            const rect = el.getBoundingClientRect()
            const y = clientY - rect.top
            const idx = Math.floor((y / rect.height) * visibleLetters.length)
            const clamped = Math.max(
                0,
                Math.min(visibleLetters.length - 1, idx)
            )
            return visibleLetters[clamped]
        },
        [visibleLetters]
    )

    const handleSelect = useCallback(
        (letter: string) => {
            setActiveLetter(letter)
            setActiveIndex(visibleLetters.indexOf(letter))
            if (
                letter !== lastLetterRef.current &&
                availableLetters.has(letter)
            ) {
                lastLetterRef.current = letter
                onSelect(letter)
            }
        },
        [availableLetters, onSelect, visibleLetters]
    )

    const handleTouchStart = useCallback(
        (e: TouchEvent) => {
            e.preventDefault()
            lastLetterRef.current = null
            const letter = getLetterFromY(e.touches[0].clientY)
            if (letter) handleSelect(letter)
        },
        [getLetterFromY, handleSelect]
    )

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            e.preventDefault()
            const letter = getLetterFromY(e.touches[0].clientY)
            if (letter) handleSelect(letter)
        },
        [getLetterFromY, handleSelect]
    )

    const handleTouchEnd = useCallback(() => {
        lastLetterRef.current = null
        setActiveLetter(null)
        setActiveIndex(null)
    }, [])

    // Attach native touch listeners with { passive: false }
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        el.addEventListener('touchstart', handleTouchStart, { passive: false })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd)
        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [handleTouchStart, handleTouchMove, handleTouchEnd])

    if (visibleLetters.length <= 1) return null

    const LETTER_HEIGHT = 18
    const STRIP_PY = 4 // py: 0.5 = 4px

    return (
        <Box sx={{
            flexShrink: 0,
            alignSelf: 'stretch',
        }}>
            {/* Floating bubble */}
            {activeLetter && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 64,
                        height: 64,
                        borderRadius: '12px',
                        backgroundColor: colors.primaryYellow,
                        border: `3px solid ${colors.primaryBlack}`,
                        boxShadow: `4px 4px 0px ${colors.primaryBlack}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        pointerEvents: 'none',
                    }}>
                    <Typography
                        sx={{
                            fontSize: 32,
                            fontWeight: 800,
                            color: colors.primaryBlack,
                            lineHeight: 1,
                        }}>
                        {activeLetter}
                    </Typography>
                </Box>
            )}
            {/* Strip */}
            <Box
                ref={containerRef}
                sx={{
                    position: 'sticky',
                    top: topOffset,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    py: 0.5,
                    ...(side === 'right' ? { ml: 2.5 } : { mr: 2.5 }),
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}>
                {/* Sliding yellow highlight */}
                {activeIndex !== null && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: STRIP_PY + activeIndex * LETTER_HEIGHT,
                            left: 0,
                            right: 0,
                            height: LETTER_HEIGHT,
                            backgroundColor: colors.primaryYellow,
                            borderRadius: '4px',
                            transition: 'top 0.12s ease-out',
                            pointerEvents: 'none',
                        }}
                    />
                )}
                {visibleLetters.map((letter) => (
                    <Typography
                        key={letter}
                        onClick={() => {
                            if (availableLetters.has(letter)) {
                                onSelect(letter)
                                setActiveLetter(letter)
                                setActiveIndex(visibleLetters.indexOf(letter))
                                setTimeout(() => {
                                    setActiveLetter(null)
                                    setActiveIndex(null)
                                }, 400)
                            }
                        }}
                        sx={{
                            position: 'relative',
                            zIndex: 1,
                            fontSize: 11,
                            fontWeight: activeLetter === letter ? 900 : 700,
                            lineHeight: `${LETTER_HEIGHT}px`,
                            color:
                                activeLetter === letter
                                    ? colors.primaryBlack
                                    : colors.primaryBrown,
                            cursor: 'pointer',
                            width: 18,
                            textAlign: 'center',
                            transition: 'font-weight 0.1s, color 0.1s',
                        }}>
                        {letter}
                    </Typography>
                ))}
            </Box>
        </Box>
    )
}
