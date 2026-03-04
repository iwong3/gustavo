import { Pool } from 'pg'

// Shared connection pool — reused across requests in the same process
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export default pool
