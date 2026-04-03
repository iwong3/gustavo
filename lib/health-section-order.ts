export type HealthSection = 'workouts' | 'diet' | 'supplements' | 'exercises' | 'symptoms'

export const DEFAULT_SECTION_ORDER: HealthSection[] = [
    'workouts', 'diet', 'supplements', 'exercises', 'symptoms',
]

const STORAGE_KEY = 'health-section-order'
const EVENT_NAME = 'health-section-order-changed'

export function getSectionOrder(): HealthSection[] {
    if (typeof window === 'undefined') return DEFAULT_SECTION_ORDER
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return DEFAULT_SECTION_ORDER
        const parsed = JSON.parse(stored) as HealthSection[]
        // Validate: must contain all sections exactly once
        if (
            parsed.length === DEFAULT_SECTION_ORDER.length &&
            DEFAULT_SECTION_ORDER.every((s) => parsed.includes(s))
        ) {
            return parsed
        }
    } catch {
        // ignore
    }
    return DEFAULT_SECTION_ORDER
}

export function saveSectionOrder(order: HealthSection[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function onSectionOrderChange(callback: () => void): () => void {
    window.addEventListener(EVENT_NAME, callback)
    return () => window.removeEventListener(EVENT_NAME, callback)
}
