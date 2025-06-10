// Shared backend types
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    timestamp: string
}

export interface DatabaseConfig {
    host: string
    port: number
    database: string
    username: string
    password: string
}
