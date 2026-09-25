export type HealthSection = 'workouts' | 'diet' | 'supplements' | 'exercises' | 'symptoms' | 'weight'

export const DEFAULT_SECTION_ORDER: HealthSection[] = [
    'workouts', 'diet', 'supplements', 'exercises', 'symptoms', 'weight',
]

const STORAGE_KEY = 'health-section-order'

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
}
