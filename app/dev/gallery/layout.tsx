import { notFound } from 'next/navigation'

/**
 * Dev-only component gallery. Hard-gated out of production builds:
 * on Vercel (NODE_ENV=production) every /dev/gallery route 404s.
 */
export default function GalleryLayout({ children }: { children: React.ReactNode }) {
    if (process.env.NODE_ENV === 'production') notFound()
    return children
}
