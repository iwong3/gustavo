// Health API service - complete implementation
import { NextRequest, NextResponse } from 'next/server'
import pool from '../db'
import { createApiResponse, handleApiError } from '../utils'

// Backend API logic for health check
export interface HealthResponse {
    status: string
    environment: string
    database: string
    timestamp: string
}

const getHealthStatus = async (): Promise<HealthResponse> => {
    let dbStatus = 'disconnected'
    try {
        await pool.query('SELECT 1')
        dbStatus = 'connected'
    } catch {
        dbStatus = 'disconnected'
    }

    return {
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
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
