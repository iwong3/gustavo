export enum Trip {
    Japan2024 = 'Japan 2024',
    Vancouver2024 = 'Vancouver 2024',
    SouthKorea2025 = 'South Korea 2025',
    Japan2025 = 'Japan 2025',
}

export const ActiveTrips = [Trip.Japan2025]

export const PastTrips = [
    Trip.Japan2024,
    Trip.Vancouver2024,
    Trip.SouthKorea2025,
]

// Derive a URL-friendly slug from a trip name (must match DB slug generation).
export const toSlug = (name: string): string =>
    name.toLowerCase().replace(/ /g, '-')

// Resolve a trip name (from DB) to the Trip enum value.
// Returns undefined if the name doesn't match any known trip.
export const tripNameToEnum = (name: string): Trip | undefined =>
    Object.values(Trip).find((t) => t === name)

// Resolve a slug to a Trip enum value.
export const slugToTrip = (slug: string): Trip | undefined =>
    Object.values(Trip).find((t) => toSlug(t) === slug)
