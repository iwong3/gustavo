import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
    let dbStatus = 'disconnected'
    try {
        await pool.query('SELECT 1')
        dbStatus = 'connected'
    } catch {
        dbStatus = 'disconnected'
    }

    return NextResponse.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        timestamp: new Date().toISOString(),
    })
}
