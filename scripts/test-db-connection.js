const { Client } = require('pg')

const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'gustavo_dev',
    user: 'gus',
    password: 'yellow_shirt_dev',
})

console.log('Testing database connection...')
console.log('Connection config:', {
    host: '127.0.0.1',
    port: 5432,
    database: 'gustavo_dev',
    user: 'gus',
    password: '***masked***',
})

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
        console.log('Error details:', {
            name: err.name,
            severity: err.severity,
            file: err.file,
            line: err.line,
            routine: err.routine,
        })
        process.exit(1)
    })
