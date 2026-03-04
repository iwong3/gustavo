const { Client } = require('pg')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    console.error('❌ DATABASE_URL is not set')
    process.exit(1)
}

const client = new Client({ connectionString })

console.log('Testing database connection...')

client
    .connect()
    .then(() => {
        console.log('✅ Connected successfully!')
        return client.query(
            'SELECT current_user, current_database(), inet_server_addr(), inet_server_port()'
        )
    })
    .then((result) => {
        console.log('Query result:', result.rows[0])
        return client.end()
    })
    .then(() => {
        console.log('✅ Connection closed successfully')
        process.exit(0)
    })
    .catch((err) => {
        console.log('❌ Connection failed:', err.message)
        console.log('Error code:', err.code)
        process.exit(1)
    })
