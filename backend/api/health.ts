// Health API service - complete implementation
import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, handleApiError } from '../utils'

// Backend API logic for health check
export interface HealthResponse {
    status: string
    environment: string
    database: string
    timestamp: string
}

const getHealthStatus = async (): Promise<HealthResponse> => {
    return {
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        database: process.env.DATABASE_URL || 'localhost',
        timestamp: new Date().toISOString(),
    }
}

// Next.js API route handler - exports for app/api routes
export async function GET(request: NextRequest) {
    try {
        const healthData = await getHealthStatus()
        const response = createApiResponse(true, healthData)
        return NextResponse.json(response)
    } catch (error) {
        const errorMessage = handleApiError(error)
        const response = createApiResponse(false, null, errorMessage)
        return NextResponse.json(response, { status: 500 })
    }
}

export const healthService = {
    getHealthStatus,
}
