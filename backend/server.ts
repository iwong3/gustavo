// Local development server
// Runs Express API + serves React build for local testing
import express, { NextFunction, Request, Response } from 'express'
import path from 'path'

const app = express()
const PORT: number = parseInt(process.env.PORT || '3001', 10)

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS for local development
app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000')
    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    )
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    )
    if (req.method === 'OPTIONS') {
        res.sendStatus(200)
    } else {
        next()
    }
})

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        environment: 'local-development',
        database: process.env.DB_HOST || 'localhost',
        timestamp: new Date().toISOString(),
    })
})

// Serve static files from React build (for production testing)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../build')))

    // Catch all handler for React routing
    app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../build', 'index.html'))
    })
}

app.listen(PORT, () => {
    console.log(`🚀 Local development server running on port ${PORT}`)
    console.log(`📡 API available at http://localhost:${PORT}/api`)
    console.log(
        `🗄️  Database: ${process.env.DB_HOST || 'localhost'}:${
            process.env.DB_PORT || 5432
        }`
    )
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
