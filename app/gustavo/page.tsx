'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFromCache } from 'utils/cache'

export default function GustavoPage() {
    const router = useRouter()

    useEffect(() => {
        const cached = getFromCache('currentTrip', '')
        if (cached) {
            // Handle old cache format (enum string "Japan 2024" → slug "japan-2024")
            const slug = cached.includes(' ')
                ? cached.toLowerCase().replace(/ /g, '-')
                : cached
            router.replace(`/gustavo/trips/${slug}`)
        } else {
            router.replace('/gustavo/trips')
        }
    }, [router])

    return null
}
