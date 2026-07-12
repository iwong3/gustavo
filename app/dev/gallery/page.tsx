'use client'

import Link from 'next/link'
import { Box, Typography } from '@mui/material'

import { colors, cardSx } from '@/lib/colors'
import { GusMenuButton, sections } from './gallery-ui'

export default function GalleryIndex() {
    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: colors.secondaryYellow, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <GusMenuButton />
                <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
                    Component Gallery
                </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                Dev only — this page 404s in production. Tap Gus to get back to the app.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 480 }}>
                {sections.map((s) => (
                    <Link key={s.slug} href={`/dev/gallery/${s.slug}`} style={{ textDecoration: 'none' }}>
                        <Box
                            sx={{
                                ...cardSx,
                                p: 1.5,
                                '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                                transition: 'transform 0.1s, box-shadow 0.1s',
                            }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.primaryBlack }}>
                                {s.title}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                {s.description}
                            </Typography>
                        </Box>
                    </Link>
                ))}
            </Box>
        </Box>
    )
}
