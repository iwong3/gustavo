/**
 * Centralized TanStack Query keys.
 *
 * Hierarchical structure: invalidating a parent key invalidates all
 * children (e.g. invalidating `trips.detail(id)` also invalidates
 * `trips.expenses(id)` and `trips.locations(id)`).
 *
 * Always use these helpers when calling `useQuery` or `invalidateQueries`
 * so invalidation is mechanical, not string-matching.
 */
export const queryKeys = {
    trips: {
        all: ['trips'] as const,
        list: () => [...queryKeys.trips.all, 'list'] as const,
        map: () => [...queryKeys.trips.all, 'map'] as const,
        bySlug: (slug: string) => [...queryKeys.trips.all, 'by-slug', slug] as const,
        detail: (tripId: string | number) =>
            [...queryKeys.trips.all, 'detail', String(tripId)] as const,
        expenses: (tripId: string | number) =>
            [...queryKeys.trips.detail(tripId), 'expenses'] as const,
        locations: (tripId: string | number) =>
            [...queryKeys.trips.detail(tripId), 'locations'] as const,
        settlements: (tripId: string | number) =>
            [...queryKeys.trips.detail(tripId), 'settlements'] as const,
        participants: (tripId: string | number) =>
            [...queryKeys.trips.detail(tripId), 'participants'] as const,
    },
    expenseCategories: {
        all: ['expense-categories'] as const,
        list: () => ['expense-categories', 'list'] as const,
        listWithMeta: () => ['expense-categories', 'list-with-meta'] as const,
    },
    users: {
        all: ['users'] as const,
        me: ['users', 'me'] as const,
        preferences: ['users', 'me', 'preferences'] as const,
    },
    places: {
        autocomplete: (query: string) => ['places', 'autocomplete', query] as const,
        detail: (placeId: string) => ['places', 'detail', placeId] as const,
    },
    health: {
        all: ['health'] as const,
        muscleGroups: ['health', 'muscle-groups'] as const,
        workouts: {
            all: ['health', 'workouts'] as const,
            list: () => ['health', 'workouts', 'list'] as const,
            detail: (id: string | number) =>
                ['health', 'workouts', 'detail', String(id)] as const,
            daysSince: ['health', 'workouts', 'days-since'] as const,
        },
        exercises: ['health', 'exercises'] as const,
        supplements: ['health', 'supplements'] as const,
        supplementLogs: {
            all: ['health', 'supplement-logs'] as const,
            byDate: (date: string) => ['health', 'supplement-logs', date] as const,
        },
        foods: ['health', 'foods'] as const,
        foodGroups: ['health', 'food-groups'] as const,
        foodLogs: {
            all: ['health', 'food-logs'] as const,
            byDate: (date: string) => ['health', 'food-logs', date] as const,
        },
        symptoms: ['health', 'symptoms'] as const,
        symptomLogs: {
            all: ['health', 'symptom-logs'] as const,
            byDate: (date: string) => ['health', 'symptom-logs', date] as const,
            forensic: (id: string | number) =>
                ['health', 'symptom-logs', 'forensic', String(id)] as const,
        },
        weightLogs: ['health', 'weight-logs'] as const,
        presets: {
            all: ['health', 'presets'] as const,
            byType: (type: 'workout' | 'diet' | 'supplement') =>
                ['health', 'presets', type] as const,
        },
    },
} as const

/**
 * Per-query staleTime overrides. Default is 30s (set on QueryClient).
 * Use these for queries whose data rarely changes.
 */
export const staleTimes = {
    short: 30_000,
    medium: 5 * 60_000,
    long: 10 * 60_000,
    forever: Infinity,
} as const
