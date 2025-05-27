// Database connection for AWS RDS PostgreSQL
import { Pool } from 'pg'

// Database connection pool
let pool: Pool | null = null

export const getDbPool = (): Pool => {
    if (!pool) {
        pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl:
                process.env.NODE_ENV === 'production'
                    ? { rejectUnauthorized: false }
                    : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        })
    }
    return pool
}

// Helper function to execute queries
export const query = async (text: string, params?: any[]) => {
    const pool = getDbPool()
    const client = await pool.connect()
    try {
        const result = await client.query(text, params)
        return result
    } finally {
        client.release()
    }
}
