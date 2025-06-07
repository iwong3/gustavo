// Backend utility functions
export const createApiResponse = <T>(
    success: boolean,
    data?: T,
    error?: string
) => ({
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
})

export const handleApiError = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message
    }
    return 'An unknown error occurred'
}
