'use client'

import { colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { useCallback, useRef } from 'react'

interface AlphabetIndexProps {
    /** Set of letters that have at least one item */
    availableLetters: Set<string>
    /** Called when user taps or drags to a letter */
    onSelect: (letter: string) => void
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function AlphabetIndex({ availableLetters, onSelect }: AlphabetIndexProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const lastLetterRef = useRef<string | null>(null)

    const getLetterFromY = useCallback((clientY: number): string | null => {
        const el = containerRef.current
        if (!el) return null
        const rect = el.getBoundingClientRect()
        const y = clientY - rect.top
        const idx = Math.floor((y / rect.height) * ALPHABET.length)
        const clamped = Math.max(0, Math.min(ALPHABET.length - 1, idx))
        return ALPHABET[clamped]
    }, [])

    const handleSelect = useCallback((letter: string) => {
        if (letter !== lastLetterRef.current && availableLetters.has(letter)) {
            lastLetterRef.current = letter
            onSelect(letter)
        }
    }, [availableLetters, onSelect])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault()
        const letter = getLetterFromY(e.touches[0].clientY)
        if (letter) handleSelect(letter)
    }, [getLetterFromY, handleSelect])

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        lastLetterRef.current = null
        const letter = getLetterFromY(e.touches[0].clientY)
        if (letter) handleSelect(letter)
    }, [getLetterFromY, handleSelect])

    const handleTouchEnd = useCallback(() => {
        lastLetterRef.current = null
    }, [])

    // Only show letters that exist in the data
    const visibleLetters = ALPHABET.filter((l) => availableLetters.has(l))
    if (visibleLetters.length <= 1) return null

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
                position: 'sticky',
                top: 0,
                alignSelf: 'flex-start',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 0.5,
                px: 0.25,
                ml: 0.5,
                flexShrink: 0,
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}>
            {visibleLetters.map((letter) => (
                <Typography
                    key={letter}
                    onClick={() => {
                        if (availableLetters.has(letter)) onSelect(letter)
                    }}
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: '18px',
                        color: colors.primaryBrown,
                        cursor: 'pointer',
                        width: 18,
                        textAlign: 'center',
                    }}>
                    {letter}
                </Typography>
            ))}
        </Box>
    )
}
